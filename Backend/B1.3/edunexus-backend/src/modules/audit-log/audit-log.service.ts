import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

export interface RecordAuditEventInput {
  /** What happened. */
  action: AuditAction;
  /** The domain entity affected, e.g. 'User', 'School', 'SystemSetting'. */
  entity: string;
  /** Primary key of the affected row, if applicable. */
  entityId?: string;
  /** Who did it — userId for human actors, omit/null for system actions. */
  userId?: string | null;
  /** 'user' | 'system' | 'api-key' etc. Defaults to 'user' when userId is set. */
  actorType?: string;
  /** Free-form structured context — request body diff, old/new values, etc. */
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  schoolId?: string | null;
}

/**
 * AuditLogService
 * ─────────────────────────────────────────────────────────────────────────────
 * Single write path for the global audit trail. Exported from AuditLogModule
 * so it can be injected into any module (auth, user, system-settings, file,
 * ...) to record auth events, admin actions, and data changes.
 *
 * Writes are fire-and-forget from the caller's perspective: failures are
 * logged but never thrown, so a broken audit write can't break the request
 * that triggered it.
 */
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          actorId: input.userId ?? null,
          actorType: input.actorType ?? (input.userId ? 'user' : 'system'),
          payload: (input.metadata ?? undefined) as Prisma.InputJsonValue,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          statusCode: input.statusCode,
          schoolId: input.schoolId ?? null,
        },
      });
    } catch (error) {
      // Audit logging must never break the calling request.
      this.logger.error(
        'Failed to write audit log entry',
        (error as Error)?.stack,
        'AuditLogService',
      );
    }
  }

  // ── Convenience wrappers for common events ──────────────────────────────────

  async recordAuthEvent(params: {
    action: typeof AuditAction.LOGIN | typeof AuditAction.LOGOUT;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    schoolId?: string | null;
  }): Promise<void> {
    return this.record({
      action: params.action,
      entity: 'AuthSession',
      entityId: params.userId,
      userId: params.userId,
      actorType: 'user',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      schoolId: params.schoolId,
    });
  }

  async recordChange(params: {
    entity: string;
    entityId: string;
    userId?: string | null;
    action: AuditAction;
    before?: unknown;
    after?: unknown;
    schoolId?: string | null;
  }): Promise<void> {
    return this.record({
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      userId: params.userId,
      metadata: { before: params.before ?? null, after: params.after ?? null },
      schoolId: params.schoolId,
    });
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async query(filters: QueryAuditLogDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(filters.action && { action: filters.action }),
      ...(filters.entity && { entity: filters.entity }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...(filters.actorId && { actorId: filters.actorId }),
      ...(filters.schoolId && { schoolId: filters.schoolId }),
      ...((filters.from || filters.to) && {
        createdAt: {
          ...(filters.from && { gte: new Date(filters.from) }),
          ...(filters.to && { lte: new Date(filters.to) }),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findForEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
