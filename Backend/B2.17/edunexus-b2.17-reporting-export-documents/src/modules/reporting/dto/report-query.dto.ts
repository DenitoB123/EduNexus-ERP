import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportExecutionStatus } from '../constants/report-status.enum';

export class ReportExecutionQueryDto {
  @IsOptional()
  @IsString()
  reportKey?: string;

  @IsOptional()
  @IsEnum(ReportExecutionStatus)
  status?: ReportExecutionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
