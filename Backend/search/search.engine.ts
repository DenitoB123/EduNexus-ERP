import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SearchHelper } from '../../database/helpers/search.helper';
import { SearchInput } from '../../database/interfaces/base-model.interface';

export class ApiSearchDTO {
  @ApiPropertyOptional({ description: 'Full-text search query' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ description: 'Comma-separated list of fields to search in' })
  @IsOptional()
  @IsString()
  fields?: string;
}

export class SearchEngine {
  static toSearchInput(dto: ApiSearchDTO, defaultFields: string[] = []): SearchInput | undefined {
    if (!dto.q) return undefined;

    const fields = dto.fields
      ? dto.fields.split(',').map((f) => f.trim()).filter(Boolean)
      : defaultFields;

    return { query: dto.q, fields };
  }

  static buildWhere(input: SearchInput | undefined, allowedFields?: string[]): Record<string, unknown> {
    if (!input) return {};
    return SearchHelper.buildWhere(input, allowedFields);
  }
}
