/**
 * search-query.dto.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Two complementary search mechanisms:
 *   - `q` — global free-text search, passed through to IFindManyOptions.search
 *     (repository-defined field set, per B2.2).
 *   - `searchFields` + `searchMode` — targeted field/multi-field search with
 *     exact or partial matching, translated into an OR'd where-clause.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type SearchMode = 'exact' | 'partial';

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Global free-text search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of fields to search within (enables field/multi-field search)',
    example: 'firstName,lastName,email',
  })
  @IsOptional()
  @IsString()
  searchFields?: string;

  @ApiPropertyOptional({ description: 'Match mode for searchFields', enum: ['exact', 'partial'], default: 'partial' })
  @IsOptional()
  @IsIn(['exact', 'partial'])
  searchMode?: SearchMode = 'partial';
}

/**
 * Translates SearchQueryDto.searchFields (+ searchMode) into an OR'd
 * where-clause fragment. Combine with the base `where` via
 * `{ ...where, OR: buildFieldSearchWhere(...) }` (Prisma-style OR, per
 * B2.2's expected `where` semantics) when both are present.
 */
export function buildFieldSearchWhere(
  searchFields: string | undefined,
  term: string | undefined,
  mode: SearchMode = 'partial',
): Record<string, unknown>[] | undefined {
  if (!searchFields || !term) return undefined;
  const fields = searchFields
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  return fields.map((field) => ({
    [field]: mode === 'exact' ? { equals: term } : { contains: term },
  }));
}
