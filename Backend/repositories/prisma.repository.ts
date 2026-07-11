import { PaginatedResult, QueryOptions } from '../../database/interfaces/base-model.interface';
import { PaginationHelper } from '../../database/helpers/pagination.helper';
import { SortHelper } from '../../database/helpers/sort.helper';
import { FilterHelper } from '../../database/helpers/filter.helper';
import { SearchHelper } from '../../database/helpers/search.helper';
import { RecordNotFoundException } from '../../database/exceptions/database.exceptions';
import { PrismaFullModelDelegate } from './interfaces/prisma-full-delegate.interface';

/**
 * Lowest layer of the B2.2 repository hierarchy: pure Prisma CRUD
 * with query composition (filter/search/sort/pagination), but no
 * multi-tenancy, auditing, or soft-delete behavior — those are
 * layered on top by TenantRepository / AuditableRepository /
 * SoftDeleteRepository, which is also where the public,
 * interface-conforming (IReadRepository/IWriteRepository) API lives.
 *
 * This class intentionally does NOT implement IReadRepository /
 * IWriteRepository itself: those interfaces are tenant-aware (every
 * method takes a tenantId), and this layer has no concept of tenancy
 * at all — that guarantee only starts at TenantRepository. Keeping
 * this layer's methods tenant-less makes it impossible to
 * accidentally call a "safe-looking" method here and skip tenant
 * scoping by mistake.
 */
export abstract class PrismaRepository<T extends { id: string }> {
  protected abstract readonly modelName: string;
  protected abstract readonly allowedFilterFields: string[];
  protected abstract readonly allowedSearchFields: string[];

  constructor(protected readonly delegate: PrismaFullModelDelegate<T>) {}

  protected buildWhere(options: QueryOptions): Record<string, unknown> {
    return {
      ...FilterHelper.buildWhere(options.filters, this.allowedFilterFields),
      ...SearchHelper.buildWhere(options.search, this.allowedSearchFields),
    };
  }

  protected async rawFindById(id: string): Promise<T | null> {
    return this.delegate.findUnique({ where: { id } });
  }

  protected async rawFindOne(where: Record<string, unknown>): Promise<T | null> {
    return this.delegate.findFirst({ where });
  }

  protected async rawFindMany(options: QueryOptions, extraWhere: Record<string, unknown> = {}): Promise<PaginatedResult<T>> {
    const { skip, take, page, pageSize } = PaginationHelper.normalize(options.pagination);
    const where = { ...this.buildWhere(options), ...extraWhere };
    const orderBy = SortHelper.buildOrderBy(options.sort, this.allowedFilterFields);

    const [items, totalItems] = await Promise.all([
      this.delegate.findMany({ where, orderBy, skip, take }),
      this.delegate.count({ where }),
    ]);

    return PaginationHelper.buildResult(items, totalItems, page, pageSize);
  }

  protected async rawExists(where: Record<string, unknown>): Promise<boolean> {
    const record = await this.delegate.findFirst({ where });
    return record !== null;
  }

  protected async rawCount(options: QueryOptions, extraWhere: Record<string, unknown> = {}): Promise<number> {
    return this.delegate.count({ where: { ...this.buildWhere(options), ...extraWhere } });
  }

  protected async rawCreate(data: Record<string, unknown>): Promise<T> {
    return this.delegate.create({ data });
  }

  protected async rawUpdate(where: Record<string, unknown>, data: Record<string, unknown>): Promise<T> {
    return this.delegate.update({ where, data });
  }

  protected async rawUpsert(
    where: Record<string, unknown>,
    create: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<T> {
    return this.delegate.upsert({ where, create, update });
  }

  protected async rawBatchCreate(items: Record<string, unknown>[]): Promise<number> {
    const result = await this.delegate.createMany({ data: items });
    return result.count;
  }

  protected async rawBatchUpdate(where: Record<string, unknown>, data: Record<string, unknown>): Promise<number> {
    const result = await this.delegate.updateMany({ where, data });
    return result.count;
  }

  protected async rawBatchDelete(where: Record<string, unknown>): Promise<number> {
    const result = await this.delegate.deleteMany({ where });
    return result.count;
  }

  protected async rawHardDelete(where: Record<string, unknown>): Promise<void> {
    await this.delegate.delete({ where });
  }

  protected assertFound(record: T | null, id: string): T {
    if (!record) throw new RecordNotFoundException(this.modelName, id);
    return record;
  }
}
