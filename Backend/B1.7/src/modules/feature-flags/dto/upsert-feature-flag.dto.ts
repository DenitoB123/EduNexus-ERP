import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsSlug } from '../../../common/validators/is-slug.validator';

export enum FeatureFlagStatusDto {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  ROLLOUT = 'ROLLOUT',
}

export class UpsertFeatureFlagDto {
  @IsSlug()
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(FeatureFlagStatusDto)
  status!: FeatureFlagStatusDto;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercent?: number;

  @IsOptional()
  @IsBoolean()
  isPilotOnly?: boolean;
}

export class SetFeatureFlagOverrideDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsBoolean()
  enabled!: boolean;
}
