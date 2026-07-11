import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { API_CONSTANTS } from '../constants/api.constants';

export class CursorPaginationDTO {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(API_CONSTANTS.MAX_PAGE_SIZE)
  take?: number = API_CONSTANTS.DEFAULT_PAGE_SIZE;
}
