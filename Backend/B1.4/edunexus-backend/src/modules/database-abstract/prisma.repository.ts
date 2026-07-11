import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  IRepository,
  FindManyParams,
  FindManyResult,
} from '../domain/interfaces/repository.interface';

type PrismaDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export abstract class PrismaRepository<T> implements IRepository<T> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {
    this.logger = new Logger(`${modelName}Repository`);
  }

  protected get delegate(): PrismaDelegate {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any)[this.modelName] as PrismaDelegate;
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({ where: { id } }) as Promise<T | null>;
  }

  async findOne(where: Record<string, unknown>): Promise<T | null> {
    return this.delegate.findFirst({ where }) as Promise<T | null>;
  }

  async findMany(params: FindManyParams): Promise<FindManyResult<T>> {
    const { skip, take, where, orderBy, include, select } = params;

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        skip,
        take,
        where: where ?? {},
        orderBy: orderBy ?? { createdAt: 'desc' },
        ...(include && { include }),
        ...(select && { select }),
      }) as Promise<T[]>,
      this.delegate.count({ where: where ?? {} }),
    ]);

    return { items, total };
  }

  async create(data: Partial<T>): Promise<T> {
    return this.delegate.create({
      data: data as Record<string, unknown>,
    }) as Promise<T>;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: data as Record<string, unknown>,
    }) as Promise<T>;
  }

  async delete(id: string): Promise<void> {
    await this.delegate.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() } as Record<string, unknown>,
    }) as Promise<T>;
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.delegate.count({ where });
  }
}

export abstract class PrismaTenantRepository<T> extends PrismaRepository<T> {
  constructor(
    prisma: PrismaService,
    modelName: string,
  ) {
    super(prisma, modelName);
  }

  async findByIdAndTenant(id: string, schoolId: string): Promise<T | null> {
    return this.delegate.findFirst({ where: { id, schoolId } }) as Promise<T | null>;
  }

  async findManyByTenant(
    schoolId: string,
    params: FindManyParams,
  ): Promise<FindManyResult<T>> {
    const where = { ...(params.where ?? {}), schoolId };
    return this.findMany({ ...params, where });
  }

  async findByIdAndTenantOrFail(id: string, schoolId: string): Promise<T> {
    const entity = await this.findByIdAndTenant(id, schoolId);
    if (!entity) {
      throw new NotFoundException(
        `Record '${id}' not found for tenant '${schoolId}'`,
      );
    }
    return entity;
  }
}
