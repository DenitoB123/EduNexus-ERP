/**
 * search-response.dto.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResultItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty() entityId!: string;
  @ApiProperty() module!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() subtitle?: string;
  @ApiProperty() score!: number;
  @ApiPropertyOptional() highlightedText?: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) metadata!: Record<string, unknown>;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class SearchResultDto {
  @ApiProperty({ type: [SearchResultItemDto] }) items!: SearchResultItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() tookMs!: number;
}

export class SuggestionDto {
  @ApiProperty() text!: string;
  @ApiPropertyOptional() entityType?: string;
  @ApiPropertyOptional() score?: number;
}
