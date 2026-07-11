import { IsOptional, IsString } from 'class-validator';

export class SortDTO {
  @IsOptional()
  @IsString()
  sort?: string;
}
