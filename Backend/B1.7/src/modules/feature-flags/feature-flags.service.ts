import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpsertFeatureFlagDto, SetFeatureFlagOverrideDto } from './dto/upsert-feature-flag.dto';

const FLAG_CACHE_TTL_SECONDS = 60;

/**
 * FeatureFlagsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolution precedence for isEnabled(key, { schoolId, userId }):
 *   1. Per-user override (FeatureFlagOverride.userId match) — wins outright.
 *   2. Per-school override (FeatureFlagOverride.schoolId match) — wins outright.
 *   3. Flag status DISABLED -> false, ENABLED -> true.
 *   4. Flag status ROLLOUT -> deterministic hash of (key + schoolId/userId)
 *      against rolloutPercent, so a given school consistently lands on the
 *      same side of the rollout instead of flapping per-request.
 *
 * This directly supports the "pilot school rollout" requirement from the
 * brief: set status=ROLLOUT + isPilotOnly with overrides naming exactly the
 * pilot schools, or status=ROLLOUT with rolloutPercent for a true gradual
 * percentage rollout.
 */
@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventBus: EventBusService,
    private readonly auditLog: AuditLogService,
  ) {}

  async isEnabled(key: string, ctx: { schoolId?: string; userId?: string } = {}): Promise<boolean> {
    const flag = await this.cache.wrap(
      `feature-flags:${key}`,
      () => this.prisma.featureFlag.findUnique({
        where: { key },
        include: { overrides: true },
      }),
      { ttl: FLAG_CACHE_TTL_SECONDS, tenantScoped: false },
    );

    if (!flag) return false;

    const userOverride = ctx.userId
      ? flag.overrides.find((o) => o.userId === ctx.userId)
      : undefined;
    if (userOverride) return userOverride.enabled;

    const schoolOverride = ctx.schoolId
      ? flag.overrides.find((o) => o.schoolId === ctx.schoolId && !o.userId)
      : undefined;
    if (schoolOverride) return schoolOverride.enabled;

    if (flag.status === 'DISABLED') return false;
    if (flag.status === 'ENABLED') return true;

    // ROLLOUT — deterministic bucket so the same tenant/user always lands
    // on the same side until rolloutPercent itself changes.
    const bucketKey = ctx.schoolId ?? ctx.userId ?? 'anonymous';
    const bucket = this.deterministicBucket(`${key}:${bucketKey}`);
    return bucket < (flag.rolloutPercent ?? 0);
  }

  async list() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
      include: { overrides: true },
    });
  }

  async upsert(dto: UpsertFeatureFlagDto, actorId?: string) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        description: dto.description,
        status: dto.status,
        rolloutPercent: dto.rolloutPercent ?? 0,
        isPilotOnly: dto.isPilotOnly ?? false,
      },
      update: {
        description: dto.description,
        status: dto.status,
        rolloutPercent: dto.rolloutPercent ?? 0,
        isPilotOnly: dto.isPilotOnly ?? false,
      },
    });

    await this.invalidate(dto.key);
    await this.auditLog.record({
      action: 'UPDATE',
      entity: 'FeatureFlag',
      entityId: flag.id,
      userId: actorId,
      metadata: { key: dto.key, status: dto.status, rolloutPercent: dto.rolloutPercent },
    });
    await this.eventBus.publish({ name: 'feature-flag.updated', payload: { key: dto.key } });

    return flag;
  }

  async setOverride(key: string, dto: SetFeatureFlagOverrideDto, actorId?: string) {
    const flag = await this.prisma.featureFlag.findUniqueOrThrow({ where: { key } });

    const override = await this.prisma.featureFlagOverride.upsert({
      where: {
        flagId_schoolId_userId: {
          flagId: flag.id,
          schoolId: dto.schoolId ?? null,
          userId: dto.userId ?? null,
        },
      },
      create: {
        flagId: flag.id,
        schoolId: dto.schoolId,
        userId: dto.userId,
        enabled: dto.enabled,
      },
      update: { enabled: dto.enabled },
    });

    await this.invalidate(key);
    await this.auditLog.record({
      action: 'UPDATE',
      entity: 'FeatureFlagOverride',
      entityId: override.id,
      userId: actorId,
      metadata: dto,
    });

    return override;
  }

  private async invalidate(key: string): Promise<void> {
    await this.cache.del(`feature-flags:${key}`, { tenantScoped: false });
  }

  /** Maps a string deterministically onto [0, 100) using a simple hash — no external deps needed. */
  private deterministicBucket(input: string): number {
    const hash = createHash('sha256').update(input).digest();
    const n = hash.readUInt32BE(0);
    return n % 100;
  }
}
