import { IReadRepository } from './read-repository.interface';
import { IWriteRepository } from './write-repository.interface';

/**
 * Marker interface for repositories that automatically scope every
 * read and write operation to a tenant, and reject any attempt to
 * mutate a record belonging to a different tenant than the one
 * supplied. Combines the read/write contracts rather than
 * introducing new methods.
 */
export type ITenantRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> =
  IReadRepository<T> & IWriteRepository<T, CreateInput, UpdateInput>;
