import { BaseModel, PaginatedResult, QueryOptions } from '../../database/interfaces/base-model.interface';
import { TenantContextService } from '../../database/context/tenant-context.service';
import { BaseRepository } from './base.repository';

export abstract class BaseService<T extends BaseModel> {
  constructor(
    protected readonly repository: BaseRepository<T>,
    protected readonly tenantContextService: TenantContextService,
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findById(id, this.tenantContextService.requireTenantId());
  }

  async findMany(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    return this.repository.findMany(options, this.tenantContextService.requireTenantId());
  }

  async create(data: Partial<T>): Promise<T> {
    return this.repository.create(
      data,
      this.tenantContextService.requireTenantId(),
      this.tenantContextService.getActorId(),
    );
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.repository.update(
      id,
      data,
      this.tenantContextService.requireTenantId(),
      this.tenantContextService.getActorId(),
    );
  }

  async remove(id: string): Promise<void> {
    await this.repository.softDelete(
      id,
      this.tenantContextService.requireTenantId(),
      this.tenantContextService.getActorId(),
    );
  }

  async restore(id: string): Promise<T> {
    return this.repository.restore(
      id,
      this.tenantContextService.requireTenantId(),
      this.tenantContextService.getActorId(),
    );
  }
}
