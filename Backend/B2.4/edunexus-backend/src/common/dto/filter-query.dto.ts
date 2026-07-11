/**
 * filter-query.dto.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Accepts filters as a JSON-encoded query parameter (`?filter={...}`) so a
 * single, generic mechanism supports dynamic filters, nested filters
 * (dot-path fields, e.g. "address.city"), and typed operators for date,
 * numeric, and boolean fields, without every business module hand-rolling
 * its own filter DTO.
 *
 * Example:
 *   ?filter={"status":{"eq":"ACTIVE"},"age":{"gte":18,"lte":65},
 *            "enrolledAt":{"gte":"2026-01-01"},"isVerified":{"eq":true},
 *            "address.city":{"eq":"Nairobi"}}
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'isNull'
  | 'isNotNull';

export type FilterValue = string | number | boolean | (string | number)[] | [unknown, unknown] | null;

export type FilterClause = Partial<Record<FilterOperator, FilterValue>>;

/** Field path (supports dot-notation for nested filters, e.g. "address.city") -> filter clause. */
export type ParsedFilters = Record<string, FilterClause>;

export class FilterQueryDto {
  @ApiPropertyOptional({
    description: 'JSON-encoded dynamic filter object, keyed by field (dot-path for nested fields) with operator clauses',
    example: '{"status":{"eq":"ACTIVE"},"age":{"gte":18}}',
  })
  @IsOptional()
  @IsString()
  filter?: string;
}

export function parseFilter(filter?: string): ParsedFilters {
  if (!filter) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(filter);
  } catch {
    throw new BadRequestException('filter must be valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestException('filter must be a JSON object keyed by field name.');
  }
  return parsed as ParsedFilters;
}

/**
 * Translates parsed filters into the `where` shape expected by
 * IFindManyOptions. Nested (dot-path) fields are translated into nested
 * objects; final where-clause interpretation of operators (e.g. mapping
 * "gte" to a Prisma-specific operator) remains the responsibility of the
 * B2.2 repository layer, which is expected to understand this operator
 * vocabulary or adapt it.
 */
export function filtersToWhere(filters: ParsedFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const [path, clause] of Object.entries(filters)) {
    const segments = path.split('.');
    let cursor = where;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      cursor[segment] = cursor[segment] ?? {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = clause;
  }

  return where;
}
