import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';
import { PaginatedResponseDto } from '../dto/response.dto';
import { IRepository } from '../../domain/interfaces/repository.interface';

export interface FindManyOptions {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

@Injectable()
export abstract class BaseService<
  TEntity,
  TCreateDto = Partial<TEntity>,
  TUpdateDto = Partial<TEntity>,
> {
  protected abstract readonly entityName: string;
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: IRepository<TEntity>,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async findById(id: string): Promise<TEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} with id '${id}' not found`);
    }
    return entity;
  }

  async findAll(
    pagination: PaginationDto,
    options?: FindManyOptions,
  ): Promise<PaginatedResponseDto<TEntity>> {
    const { items, total } = await this.repository.findMany({
      skip: pagination.skip,
      take: pagination.take,
      where: options?.where,
      orderBy: options?.orderBy ?? {
        [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc',
      },
    });

    return PaginatedResponseDto.of(
      items,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  async create(dto: TCreateDto): Promise<TEntity> {
    return this.repository.create(dto as Partial<TEntity>);
  }

  async update(id: string, dto: TUpdateDto): Promise<TEntity> {
    await this.findById(id);
    return this.repository.update(id, dto as Partial<TEntity>);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }

  async softRemove(id: string): Promise<TEntity> {
    await this.findById(id);
    return this.repository.softDelete(id);
  }

  async exists(id: string): Promise<boolean> {
    const entity = await this.repository.findById(id);
    return entity !== null;
  }
}
