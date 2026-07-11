import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SortHelper } from '../../database/helpers/sort.helper';
import { SortInput } from '../../database/interfaces/base-model.interface';

export class ApiSortDTO {
  @ApiPropertyOptional({
    description: 'Comma-separated sort fields with optional :asc/:desc direction. E.g. "createdAt:desc,name:asc"',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class SortingEngine {
  static parse(raw: string | undefined, allowedFields?: string[]): SortInput[] {
    if (!raw) return [];

    const parsed: SortInput[] = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [field, order] = part.split(':');
        return { field: field.trim(), order: order?.trim() === 'desc' ? 'desc' : 'asc' } as SortInput;
      });

    return SortHelper.buildOrderBy(parsed, allowedFields).map((obj) => {
      const [field, order] = Object.entries(obj)[0];
      return { field, order } as SortInput;
    });
  }

  static buildOrderBy(inputs: SortInput[], allowedFields?: string[]) {
    return SortHelper.buildOrderBy(inputs, allowedFields);
  }
}
