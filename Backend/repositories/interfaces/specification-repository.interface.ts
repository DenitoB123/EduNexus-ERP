import { PaginatedResult, PaginationInput } from '../../../database/interfaces/base-model.interface';
import { ISpecification } from '../../base/specification';

export interface ISpecificationRepository<T> {
  findBySpecification(spec: ISpecification<T>, tenantId: string, pagination?: PaginationInput): Promise<PaginatedResult<T>>;
  countBySpecification(spec: ISpecification<T>, tenantId: string): Promise<number>;
}
