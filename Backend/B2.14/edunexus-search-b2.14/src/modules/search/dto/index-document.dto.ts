/**
 * index-document.dto.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class IndexDocumentDto {
  @ApiProperty({ description: 'Entity type, e.g. "Student"' })
  @IsString()
  entityType!: string;

  @ApiProperty({ description: 'Entity id' })
  @IsString()
  entityId!: string;

  @ApiProperty({ description: 'Pre-built search document fields (title, searchableText, metadata, etc.)' })
  @IsObject()
  document!: Record<string, unknown>;
}

export class BulkIndexDocumentDto {
  @ApiProperty({ type: [IndexDocumentDto], maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  items!: IndexDocumentDto[];
}

export class DeleteFromIndexDto {
  @ApiProperty()
  @IsString()
  entityType!: string;

  @ApiProperty()
  @IsString()
  entityId!: string;
}

export class SuggestionQueryDto {
  @ApiProperty({ description: 'Prefix to autocomplete' })
  @IsString()
  prefix!: string;

  @IsOptional()
  @IsString()
  entityType?: string;
}
