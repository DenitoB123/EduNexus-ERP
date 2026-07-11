import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExportFormat } from '../constants/export-format.enum';
import { FilterOperator } from '../../../database/interfaces/base-model.interface';

export class FilterConditionDto {
  @IsString()
  field!: string;

  @IsString()
  operator!: FilterOperator;

  @IsOptional()
  value?: unknown;
}

export class SortInputDto {
  @IsString()
  field!: string;

  @IsIn(['asc', 'desc'])
  order!: 'asc' | 'desc';
}

export class AggregationSpecDto {
  @IsString()
  field!: string;

  @IsIn(['sum', 'avg', 'min', 'max', 'count'])
  fn!: 'sum' | 'avg' | 'min' | 'max' | 'count';

  @IsOptional()
  @IsString()
  alias?: string;
}

export class GenerateReportDto {
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters?: FilterConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortInputDto)
  sort?: SortInputDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregationSpecDto)
  aggregations?: AggregationSpecDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  templateId?: string;

  /** If true, forces asynchronous (queued) generation regardless of row-count heuristics. */
  @IsOptional()
  @IsBoolean()
  async?: boolean;
}
