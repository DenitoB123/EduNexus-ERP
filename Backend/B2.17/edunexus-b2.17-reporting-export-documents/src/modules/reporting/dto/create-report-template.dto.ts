import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { BrandingConfig, ReportLayoutConfig } from '../interfaces/branding.interface';

export class CreateReportTemplateDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  reportKey!: string;

  @IsOptional()
  @IsObject()
  layout?: ReportLayoutConfig;

  @IsOptional()
  @IsObject()
  branding?: BrandingConfig;

  @IsOptional()
  @IsObject()
  defaultParameters?: Record<string, unknown>;
}
