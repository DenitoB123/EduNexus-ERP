/**
 * pagination.util.ts
 *
 * B2.3 — Generic Service Layer
 */

import { IPaginationOptions } from '../interfaces/repository.interfaces';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

export function normalizePagination(input?: Partial<IPaginationOptions>): IPaginationOptions {
  const page = input?.page && input.page > 0 ? Math.floor(input.page) : DEFAULT_PAGE;
  let pageSize = input?.pageSize && input.pageSize > 0 ? Math.floor(input.pageSize) : DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }
  return { page, pageSize };
}

export function toSkipTake(pagination: IPaginationOptions): { skip: number; take: number } {
  return {
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function totalPages(total: number, pageSize: number): number {
  return pageSize > 0 ? Math.ceil(total / pageSize) : 0;
}
