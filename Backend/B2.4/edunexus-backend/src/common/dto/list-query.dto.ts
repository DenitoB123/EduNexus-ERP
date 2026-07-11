/**
 * list-query.dto.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * The single query DTO used by generic `findAll` / `GET` list endpoints,
 * composing pagination + sort + filter + search so business modules get
 * all of it for free instead of declaring four separate DTOs per entity.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IntersectionType } from '@nestjs/swagger';
import { OffsetPaginationQueryDto } from './pagination-query.dto';
import { SortQueryDto, sortToOrderBy } from './sort-query.dto';
import { FilterQueryDto, parseFilter, filtersToWhere } from './filter-query.dto';
import { SearchQueryDto, buildFieldSearchWhere } from './search-query.dto';
import { IFindManyOptions } from '../interfaces/repository.interfaces';
import { IPaginationOptions } from '../interfaces/repository.interfaces';
import { normalizePagination } from '../utils/pagination.util';
import { IsOptional } from 'class-validator';

export class ListQueryDto extends IntersectionType(
  OffsetPaginationQueryDto,
  IntersectionType(SortQueryDto, IntersectionType(FilterQueryDto, SearchQueryDto)),
) {
  @ApiPropertyOptional({ description: 'Include soft-deleted records', default: false })
  @IsOptional()
  withDeleted?: boolean = false;
}

export interface IParsedListQuery<TEntity> {
  options: IFindManyOptions<TEntity>;
  pagination: IPaginationOptions;
}

/** Converts a ListQueryDto into repository-ready IFindManyOptions + normalized pagination. */
export function parseListQuery<TEntity>(query: ListQueryDto): IParsedListQuery<TEntity> {
  const filters = parseFilter(query.filter);
  const filterWhere = filtersToWhere(filters);
  const fieldSearchOr = buildFieldSearchWhere(query.searchFields, query.q, query.searchMode);

  const where: Record<string, unknown> = { ...filterWhere };
  if (fieldSearchOr) {
    where.OR = fieldSearchOr;
  }

  const options: IFindManyOptions<TEntity> = {
    where,
    orderBy: sortToOrderBy(query.sort),
    // Only set the generic `search` passthrough when no targeted field
    // search was requested, to avoid the repository double-applying search.
    search: query.searchFields ? undefined : query.q,
    withDeleted: query.withDeleted ?? false,
  };

  return {
    options,
    pagination: normalizePagination({ page: query.page, pageSize: query.pageSize }),
  };
}
