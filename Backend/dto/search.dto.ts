import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchDTO {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  q?: string;

  @IsOptional()
  @IsString()
  fields?: string;
}
