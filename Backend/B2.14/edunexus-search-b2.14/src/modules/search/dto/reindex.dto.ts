/**
 * reindex.dto.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReindexRequestDto {
  @ApiPropertyOptional({ description: 'Limit reindex to a single entity type, e.g. "Student". Omit to reindex all.' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ default: 200, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Run as a background job instead of synchronously', default: true })
  @IsOptional()
  @IsBoolean()
  background?: boolean;
}
