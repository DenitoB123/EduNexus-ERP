import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { BrandingConfig, ReportLayoutConfig } from '../interfaces/branding.interface';

/**
 * Written out explicitly (rather than `PartialType(CreateReportTemplateDto)`)
 * because `@nestjs/mapped-types` is not currently a declared dependency
 * of this repository — see IMPLEMENTATION_SUMMARY_B2_12.md.
 */
export class UpdateReportTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

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

