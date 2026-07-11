import { IRepository } from '../../database/interfaces/repository.interface';
import { BaseModel, PaginatedResult, QueryOptions } from '../../database/interfaces/base-model.interface';
import { QueryBuilder } from '../../database/helpers/query-builder.helper';
import { PaginationHelper } from '../../database/helpers/pagination.helper';
import {
  OptimisticLockException,
  RecordNotFoundException,
} from '../../database/exceptions/database.exceptions';
import { PrismaModelDelegate } from './prisma-model-delegate.interface';

export abstract class BaseRepository<T extends BaseModel>
  implements IRepository<T, Partial<T>, Partial<T>>
{
  protected abstract readonly modelName: string;
  protected abstract readonly allowedFilterFields: string[];

  constructor(protected readonly delegate: PrismaModelDelegate<T>) {}

  async findById(id: string, tenantId: string): Promise<T | null> {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findOne(options: QueryOptions, tenantId: string): Promise<T | null> {
    const { where } = QueryBuilder.build(options, tenantId, this.allowedFilterFields);
    return this.delegate.findFirst({ where });
  }

  async findMany(options: QueryOptions, tenantId: string): Promise<PaginatedResult<T>> {
    const { where, orderBy, skip, take, page, pageSize } = QueryBuilder.build(
      options,
      tenantId,
      this.allowedFilterFields,
    );

    const [items, totalItems] = await Promise.all([
      this.delegate.findMany({ where, orderBy, skip, take }),
      this.delegate.count({ where }),
    ]);

    return PaginationHelper.buildResult(items, totalItems, page, pageSize);
  }

  async create(data: Partial<T>, tenantId: string, actorId?: string): Promise<T> {
    return this.delegate.create({
      data: { ...data, tenantId, createdBy: actorId, updatedBy: actorId, version: 1 },
    });
  }

  async update(id: string, data: Partial<T>, tenantId: string, actorId?: string): Promise<T> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new RecordNotFoundException(this.modelName, id);
    }

    try {
      return await this.delegate.update({
        where: { id, tenantId, version: existing.version },
        data: { ...data, updatedBy: actorId, version: { increment: 1 } },
      });
    } catch {
      throw new OptimisticLockException(this.modelName, id);
    }
  }

  async softDelete(id: string, tenantId: string, actorId?: string): Promise<T> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new RecordNotFoundException(this.modelName, id);
    }

    return this.delegate.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), deletedBy: actorId, updatedBy: actorId },
    });
  }

  async restore(id: string, tenantId: string, actorId?: string): Promise<T> {
    return this.delegate.update({
      where: { id, tenantId },
      data: { deletedAt: null, deletedBy: null, updatedBy: actorId },
    });
  }

  async hardDelete(): Promise<void> {
    throw new Error(
      'hardDelete() is disabled by default. Override explicitly in a subclass if permanent deletion is required.',
    );
  }

  async count(options: QueryOptions, tenantId: string): Promise<number> {
    const { where } = QueryBuilder.build(options, tenantId, this.allowedFilterFields);
    return this.delegate.count({ where });
  }
}
