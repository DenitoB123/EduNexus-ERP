import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'crypto';
import { FileVisibility, StoredFile } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/config.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EventBusService, SYSTEM_EVENTS } from '../event-bus/event-bus.service';
import { UploadFileDto } from './dto/upload-file.dto';

export interface UploadedFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RequestingActor {
  userId: string;
  schoolId: string | null;
  roles: string[];
}

const ADMIN_ROLES = ['admin', 'super-admin', 'school-owner', 'school-admin'];

/**
 * FileService
 * ─────────────────────────────────────────────────────────────────────────────
 * Upload, metadata, and access control for files stored in S3-compatible
 * object storage (AWS S3, MinIO, DigitalOcean Spaces, etc. — selected via
 * STORAGE_PROVIDER / S3_ENDPOINT config, no code change needed to switch).
 *
 * Tenant isolation: every object key is namespaced as
 *   schools/{schoolId}/{category}/{uuid}-{sanitizedName}
 * (or `global/...` when schoolId is null, e.g. platform-level assets).
 * A user can never address another tenant's object even if they guess an id,
 * because access checks always re-verify StoredFile.schoolId against the
 * requester's schoolId before issuing a signed URL.
 *
 * Files are never served directly from this API — access is always via a
 * short-lived signed URL (SIGNED_URL_EXPIRY_SECONDS), so the bucket can
 * remain entirely private.
 */
@Injectable()
export class FileService {
  private readonly s3: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly logger: AppLoggerService,
    private readonly auditLog: AuditLogService,
    private readonly eventBus: EventBusService,
  ) {
    this.s3 = new S3Client({
      region: this.config.s3Region,
      ...(this.config.s3Endpoint && { endpoint: this.config.s3Endpoint }),
      forcePathStyle: this.config.s3ForcePathStyle,
      credentials: {
        accessKeyId: this.config.s3AccessKeyId,
        secretAccessKey: this.config.s3SecretAccessKey,
      },
    });
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async upload(
    file: UploadedFileInput,
    dto: UploadFileDto,
    actor: RequestingActor,
  ): Promise<StoredFile> {
    if (file.sizeBytes > this.config.maxFileSizeBytes) {
      throw new BadRequestException(
        `File exceeds maximum allowed size of ${this.config.maxFileSizeBytes} bytes`,
      );
    }

    this.assertAllowedMimeType(file.mimeType);

    const bucket = this.config.s3Bucket;
    const key = this.buildObjectKey(actor.schoolId, dto.category, file.originalName);
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    let record = await this.prisma.storedFile.create({
      data: {
        bucket,
        key,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        checksum,
        status: 'PENDING',
        visibility: dto.visibility ?? FileVisibility.PRIVATE,
        schoolId: actor.schoolId,
        uploadedById: actor.userId,
      },
    });

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimeType,
          Metadata: { checksum, uploadedBy: actor.userId },
        }),
      );

      record = await this.prisma.storedFile.update({
        where: { id: record.id },
        data: { status: 'UPLOADED' },
      });
    } catch (error) {
      await this.prisma.storedFile.update({
        where: { id: record.id },
        data: { status: 'FAILED' },
      });
      this.logger.error(
        `S3 upload failed for key ${key}`,
        (error as Error)?.stack,
        'FileService',
      );
      throw new BadRequestException('File upload failed, please try again');
    }

    await this.auditLog.record({
      action: 'CREATE',
      entity: 'StoredFile',
      entityId: record.id,
      userId: actor.userId,
      schoolId: actor.schoolId,
      metadata: { originalName: file.originalName, mimeType: file.mimeType },
    });

    await this.eventBus.publish({
      name: SYSTEM_EVENTS.FILE_UPLOADED,
      payload: { fileId: record.id, schoolId: actor.schoolId, uploadedBy: actor.userId },
      schoolId: actor.schoolId,
    });

    return record;
  }

  // ── Access ───────────────────────────────────────────────────────────────────

  async getMetadata(id: string, actor: RequestingActor): Promise<StoredFile> {
    const file = await this.findOrThrow(id);
    this.assertReadAccess(file, actor);
    return file;
  }

  /** Returns a short-lived signed GET URL — never returns the bucket/key directly. */
  async getDownloadUrl(id: string, actor: RequestingActor): Promise<{ url: string; expiresIn: number }> {
    const file = await this.findOrThrow(id);
    this.assertReadAccess(file, actor);

    const expiresIn = this.config.signedUrlExpirySeconds;
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: file.bucket, Key: file.key }),
      { expiresIn },
    );

    await this.auditLog.record({
      action: 'READ',
      entity: 'StoredFile',
      entityId: file.id,
      userId: actor.userId,
      schoolId: actor.schoolId,
    });

    return { url, expiresIn };
  }

  async remove(id: string, actor: RequestingActor): Promise<void> {
    const file = await this.findOrThrow(id);
    this.assertWriteAccess(file, actor);

    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key }));
    } catch (error) {
      this.logger.error(
        `S3 delete failed for key ${file.key}`,
        (error as Error)?.stack,
        'FileService',
      );
      // Continue — soft-delete the metadata regardless, so the user-facing
      // operation succeeds; a background reconciliation job can clean up
      // any object that the bucket still holds.
    }

    await this.prisma.storedFile.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    await this.auditLog.record({
      action: 'DELETE',
      entity: 'StoredFile',
      entityId: id,
      userId: actor.userId,
      schoolId: actor.schoolId,
    });
  }

  async listForSchool(schoolId: string | null, page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where = { schoolId, deletedAt: null };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.storedFile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.storedFile.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async findOrThrow(id: string): Promise<StoredFile> {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file || file.deletedAt) {
      throw new NotFoundException(`File ${id} not found`);
    }
    return file;
  }

  /**
   * Tenant isolation gate. PUBLIC files are readable by anyone; SCHOOL files
   * are readable only by members of the owning school; PRIVATE files are
   * readable only by the uploader or an admin-tier role within that school.
   */
  private assertReadAccess(file: StoredFile, actor: RequestingActor): void {
    if (file.visibility === FileVisibility.PUBLIC) return;

    if (file.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    if (file.visibility === FileVisibility.SCHOOL) return;

    // PRIVATE
    const isOwner = file.uploadedById === actor.userId;
    const isPrivileged = actor.roles.some((r) => ADMIN_ROLES.includes(r));
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have access to this file');
    }
  }

  private assertWriteAccess(file: StoredFile, actor: RequestingActor): void {
    if (file.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You do not have access to this file');
    }
    const isOwner = file.uploadedById === actor.userId;
    const isPrivileged = actor.roles.some((r) => ADMIN_ROLES.includes(r));
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to delete this file');
    }
  }

  private buildObjectKey(
    schoolId: string | null,
    category: string | undefined,
    originalName: string,
  ): string {
    const tenantSegment = schoolId ? `schools/${schoolId}` : 'global';
    const categorySegment = category ? this.sanitizeSegment(category) : 'misc';
    const sanitizedName = this.sanitizeSegment(originalName);
    return `${tenantSegment}/${categorySegment}/${randomUUID()}-${sanitizedName}`;
  }

  private sanitizeSegment(segment: string): string {
    return segment.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
  }

  private assertAllowedMimeType(mimeType: string): void {
    const allowedPrefixes = ['image/', 'application/pdf', 'application/msword'];
    const allowedExact = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
    ];

    const ok =
      allowedPrefixes.some((p) => mimeType.startsWith(p)) || allowedExact.includes(mimeType);

    if (!ok) {
      throw new BadRequestException(`File type '${mimeType}' is not allowed`);
    }
  }
}
