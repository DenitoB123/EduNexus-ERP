import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Prisma, SettingScope, SettingValueType, SystemSetting } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

export interface ResolvedSetting<T = unknown> {
  key: string;
  value: T;
  scope: SettingScope;
  schoolId: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'system-setting:';

/**
 * SystemSettingsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Tenant-aware key-value configuration store.
 *
 * Resolution order for `get(key, schoolId)`:
 *   1. SCHOOL-scoped row for the given schoolId (tenant override), if any
 *   2. GLOBAL row for the key (platform default)
 *   3. null if neither exists
 *
 * Secret values (isSecret = true) are encrypted at rest via EncryptionService
 * and only decrypted on read by an authorized caller — they're never returned
 * in admin listing endpoints in plaintext (see SystemSettingsController).
 */
@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly auditLog: AuditLogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ── Reads ────────────────────────────────────────────────────────────────────

  async get<T = unknown>(
    key: string,
    schoolId?: string | null,
  ): Promise<ResolvedSetting<T> | null> {
    const cacheKey = this.buildCacheKey(key, schoolId);
    const cached = await this.cache.get<ResolvedSetting<T>>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const row = await this.resolveRow(key, schoolId);
    if (!row) return null;

    const resolved: ResolvedSetting<T> = {
      key: row.key,
      value: this.deserialize<T>(row),
      scope: row.scope,
      schoolId: row.schoolId,
    };

    await this.cache.set(cacheKey, resolved, CACHE_TTL_MS);
    return resolved;
  }

  /** Throws if the setting doesn't exist at any scope. */
  async getOrThrow<T = unknown>(key: string, schoolId?: string | null): Promise<T> {
    const resolved = await this.get<T>(key, schoolId);
    if (!resolved) {
      throw new NotFoundException(`Setting '${key}' is not configured`);
    }
    return resolved.value;
  }

  async getWithDefault<T = unknown>(
    key: string,
    defaultValue: T,
    schoolId?: string | null,
  ): Promise<T> {
    const resolved = await this.get<T>(key, schoolId);
    return resolved ? resolved.value : defaultValue;
  }

  async list(scope?: SettingScope, schoolId?: string): Promise<SystemSetting[]> {
    const where: Prisma.SystemSettingWhereInput = {
      ...(scope && { scope }),
      ...(schoolId && { schoolId }),
    };
    const rows = await this.prisma.systemSetting.findMany({
      where,
      orderBy: { key: 'asc' },
    });
    return rows.map((row) => this.maskSecret(row));
  }

  // ── Writes ───────────────────────────────────────────────────────────────────

  async create(dto: CreateSettingDto, actorId?: string): Promise<SystemSetting> {
    const scope = dto.scope ?? SettingScope.GLOBAL;
    const schoolId = scope === SettingScope.SCHOOL ? dto.schoolId ?? null : null;
    const valueType = dto.valueType ?? SettingValueType.STRING;
    const storedValue = dto.isSecret
      ? this.encryption.encrypt(dto.value)
      : dto.value;

    const setting = await this.prisma.systemSetting.upsert({
      where: { key_schoolId: { key: dto.key, schoolId } },
      update: {
        value: storedValue,
        valueType,
        isSecret: dto.isSecret ?? false,
        updatedBy: actorId,
      },
      create: {
        key: dto.key,
        value: storedValue,
        valueType,
        scope,
        schoolId,
        isSecret: dto.isSecret ?? false,
        updatedBy: actorId,
      },
    });

    await this.invalidate(dto.key, schoolId);

    await this.auditLog.record({
      action: 'CREATE',
      entity: 'SystemSetting',
      entityId: setting.id,
      userId: actorId,
      schoolId,
      metadata: { key: dto.key, scope, isSecret: dto.isSecret ?? false },
    });

    return this.maskSecret(setting);
  }

  async update(
    id: string,
    dto: UpdateSettingDto,
    actorId?: string,
  ): Promise<SystemSetting> {
    const existing = await this.prisma.systemSetting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Setting ${id} not found`);
    }

    const isSecret = dto.isSecret ?? existing.isSecret;
    const storedValue = isSecret ? this.encryption.encrypt(dto.value) : dto.value;

    const setting = await this.prisma.systemSetting.update({
      where: { id },
      data: { value: storedValue, isSecret, updatedBy: actorId },
    });

    await this.invalidate(existing.key, existing.schoolId);

    await this.auditLog.record({
      action: 'UPDATE',
      entity: 'SystemSetting',
      entityId: setting.id,
      userId: actorId,
      schoolId: existing.schoolId,
      metadata: { key: existing.key },
    });

    return this.maskSecret(setting);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const existing = await this.prisma.systemSetting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Setting ${id} not found`);
    }

    await this.prisma.systemSetting.delete({ where: { id } });
    await this.invalidate(existing.key, existing.schoolId);

    await this.auditLog.record({
      action: 'DELETE',
      entity: 'SystemSetting',
      entityId: id,
      userId: actorId,
      schoolId: existing.schoolId,
      metadata: { key: existing.key },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async resolveRow(
    key: string,
    schoolId?: string | null,
  ): Promise<SystemSetting | null> {
    if (schoolId) {
      const schoolRow = await this.prisma.systemSetting.findUnique({
        where: { key_schoolId: { key, schoolId } },
      });
      if (schoolRow) return schoolRow;
    }

    return this.prisma.systemSetting.findUnique({
      where: { key_schoolId: { key, schoolId: null } },
    });
  }

  private deserialize<T>(row: SystemSetting): T {
    const raw = row.isSecret ? this.encryption.decrypt(row.value) : row.value;

    switch (row.valueType) {
      case SettingValueType.NUMBER:
        return Number(raw) as unknown as T;
      case SettingValueType.BOOLEAN:
        return (raw === 'true') as unknown as T;
      case SettingValueType.JSON:
        return JSON.parse(raw) as T;
      default:
        return raw as unknown as T;
    }
  }

  /** Never expose a secret's decrypted (or even encrypted) value over the API. */
  private maskSecret(row: SystemSetting): SystemSetting {
    if (!row.isSecret) return row;
    return { ...row, value: '••••••••' };
  }

  private buildCacheKey(key: string, schoolId?: string | null): string {
    return `${CACHE_PREFIX}${key}:${schoolId ?? 'global'}`;
  }

  private async invalidate(key: string, schoolId: string | null): Promise<void> {
    // A SCHOOL-scoped write only affects that tenant's cache entry; a
    // GLOBAL write affects the global entry. Each is invalidated independently.
    await this.cache.del(this.buildCacheKey(key, schoolId));
  }
}
