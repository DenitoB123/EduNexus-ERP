import { IsObject, IsOptional } from 'class-validator';

export class FilterDTO {
  @IsOptional()
  @IsObject()
  filter?: Record<string, Record<string, string>>;
}
