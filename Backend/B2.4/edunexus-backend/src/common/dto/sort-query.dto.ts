/**
 * sort-query.dto.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Accepts sort as a comma-separated list of `field:direction` pairs, e.g.
 * `?sort=lastName:asc,createdAt:desc`, so a single query param supports
 * both single-field and multi-field sorting.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const SORT_PATTERN = /^[a-zA-Z0-9_.]+:(asc|desc)(,[a-zA-Z0-9_.]+:(asc|desc))*$/;

export class SortQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated `field:direction` pairs, e.g. "lastName:asc,createdAt:desc"',
    example: 'createdAt:desc',
  })
  @IsOptional()
  @IsString()
  @Matches(SORT_PATTERN, {
    message: 'sort must be a comma-separated list of "field:asc" or "field:desc" pairs',
  })
  sort?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface IParsedSort {
  field: string;
  direction: SortDirection;
}

/** Parses a SortQueryDto.sort string into an ordered list of field/direction pairs. */
export function parseSort(sort?: string): IParsedSort[] {
  if (!sort) return [];
  return sort.split(',').map((clause) => {
    const [field, direction] = clause.split(':');
    return { field, direction: (direction as SortDirection) ?? 'asc' };
  });
}

/** Converts parsed sort clauses into the `orderBy` shape expected by IFindManyOptions. */
export function sortToOrderBy(sort?: string): Record<string, SortDirection>[] | undefined {
  const parsed = parseSort(sort);
  if (parsed.length === 0) return undefined;
  return parsed.map((clause) => ({ [clause.field]: clause.direction }));
}
