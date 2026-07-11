import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SettingScope, SettingValueType } from '@prisma/client';

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsEnum(SettingValueType)
  valueType?: SettingValueType;

  @IsOptional()
  @IsEnum(SettingScope)
  scope?: SettingScope;

  /** Required when scope = SCHOOL; ignored for GLOBAL. */
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}
