/**
 * query-options.util.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Small, dependency-free helpers for composing repository query options
 * (filter/search/sort) without every business module reinventing merge
 * logic. Actual field-level query translation (e.g. to Prisma `where`
 * syntax) remains the responsibility of the B2.2 repository layer — these
 * helpers only shape the IFindManyOptions object passed into it.
 */

import { IFindManyOptions } from '../interfaces/repository.interfaces';

export function mergeWhere<T>(
  base: IFindManyOptions<T>['where'],
  additional: IFindManyOptions<T>['where'],
): IFindManyOptions<T>['where'] {
  if (!base) return additional;
  if (!additional) return base;
  return { ...base, ...additional };
}

export function buildSort(
  sortBy?: string,
  sortDirection: 'asc' | 'desc' = 'asc',
): Record<string, 'asc' | 'desc'> | undefined {
  if (!sortBy) return undefined;
  return { [sortBy]: sortDirection };
}

export function composeFindOptions<T>(params: {
  where?: IFindManyOptions<T>['where'];
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  include?: Record<string, unknown>;
  withDeleted?: boolean;
}): IFindManyOptions<T> {
  return {
    where: params.where,
    search: params.search,
    orderBy: buildSort(params.sortBy, params.sortDirection),
    include: params.include,
    withDeleted: params.withDeleted ?? false,
  };
}
