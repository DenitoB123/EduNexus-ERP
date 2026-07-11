import { IReadModel } from '../interfaces/projection.interface';

/**
 * Optional convenience base for a concrete read model. Business
 * modules (B3+) are free to shape their read models however they
 * like (a dedicated Prisma table, a cached JSON blob, etc.) — this
 * only standardizes the three fields `IReadModel` requires plus a
 * constructor helper, matching the same lightweight-base-class
 * pattern as `BaseEntity`/`ValueObject` (common/base, B1.1/B2.1).
 */
export abstract class ReadModelBase implements IReadModel {
  readonly id: string;
  readonly tenantId: string;
  readonly projectedAt: Date;
  readonly sourceEventId: string;

  protected constructor(id: string, tenantId: string, sourceEventId: string, projectedAt: Date = new Date()) {
    this.id = id;
    this.tenantId = tenantId;
    this.sourceEventId = sourceEventId;
    this.projectedAt = projectedAt;
  }
}
