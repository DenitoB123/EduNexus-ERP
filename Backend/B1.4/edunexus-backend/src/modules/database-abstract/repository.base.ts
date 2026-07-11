import { Logger } from '@nestjs/common';
import {
  IRepository,
  FindManyParams,
  FindManyResult,
} from '../domain/interfaces/repository.interface';

export abstract class RepositoryBase<T> implements IRepository<T> {
  protected readonly logger: Logger;

  constructor(repositoryName: string) {
    this.logger = new Logger(repositoryName);
  }

  abstract findById(id: string): Promise<T | null>;
  abstract findOne(where: Record<string, unknown>): Promise<T | null>;
  abstract findMany(params: FindManyParams): Promise<FindManyResult<T>>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract softDelete(id: string): Promise<T>;
  abstract count(where?: Record<string, unknown>): Promise<number>;
}
