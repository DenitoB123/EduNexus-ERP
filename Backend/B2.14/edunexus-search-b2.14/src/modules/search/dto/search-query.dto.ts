/**
 * search-query.dto.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchMode } from '../interfaces/search-query.interface';

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['keyword', 'phrase', 'exact', 'partial'], default: 'keyword' })
  @IsOptional()
  @IsIn(['keyword', 'phrase', 'exact', 'partial'])
  mode?: SearchMode;

  @ApiPropertyOptional({ description: 'JSON-encoded ISearchFilters object' })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({ description: 'Comma-separated `field:direction` pairs, e.g. "relevance:desc"' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
