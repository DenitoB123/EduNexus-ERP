/**
 * bulk-operations.dto.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const MAX_BULK_SIZE = 500;

export class BulkCreateDto<TCreateDto = unknown> {
  @ApiProperty({ description: 'Records to create', type: 'array', maxItems: MAX_BULK_SIZE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @ValidateNested({ each: true })
  @Type(() => Object)
  items!: TCreateDto[];
}

export class BulkUpdateItemDto<TUpdateDto = unknown> {
  @ApiProperty({ description: 'Id of the record to update' })
  id!: string;

  @ApiProperty({ description: 'Fields to update' })
  data!: TUpdateDto;
}

export class BulkUpdateDto<TUpdateDto = unknown> {
  @ApiProperty({ description: 'Records to update', type: 'array', maxItems: MAX_BULK_SIZE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  items!: BulkUpdateItemDto<TUpdateDto>[];
}

export class BulkDeleteDto {
  @ApiProperty({ description: 'Ids of the records to delete', type: [String], maxItems: MAX_BULK_SIZE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @IsString({ each: true })
  ids!: string[];
}

export class BulkRestoreDto {
  @ApiProperty({ description: 'Ids of the records to restore', type: [String], maxItems: MAX_BULK_SIZE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @IsString({ each: true })
  ids!: string[];
}

export class BulkImportDto {
  @ApiProperty({ description: 'Import file format', enum: ['csv', 'xlsx', 'json'] })
  @IsIn(['csv', 'xlsx', 'json'])
  format!: 'csv' | 'xlsx' | 'json';

  @ApiProperty({ description: 'Base64-encoded file contents' })
  @IsString()
  fileContent!: string;

  @ApiPropertyOptional({ description: 'If true, validates the file and reports errors without persisting any records', default: false })
  @IsOptional()
  dryRun?: boolean = false;
}

export class BulkExportQueryDto {
  @ApiPropertyOptional({ description: 'Export file format', enum: ['csv', 'xlsx', 'json'], default: 'csv' })
  @IsOptional()
  @IsIn(['csv', 'xlsx', 'json'])
  format?: 'csv' | 'xlsx' | 'json' = 'csv';

  @ApiPropertyOptional({ description: 'JSON-encoded dynamic filter object applied before export, same syntax as the list endpoint' })
  @IsOptional()
  @IsString()
  filter?: string;
}

export interface IBulkImportResult<TEntity> {
  totalRows: number;
  successCount: number;
  failureCount: number;
  created: TEntity[];
  errors: { row: number; message: string }[];
  dryRun: boolean;
}
