import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { API_CONSTANTS } from '../constants/api.constants';

export class PaginationDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(API_CONSTANTS.MAX_PAGE_SIZE)
  pageSize?: number = API_CONSTANTS.DEFAULT_PAGE_SIZE;
}
