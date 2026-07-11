import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}
