import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { API_CONSTANTS } from '../../common/constants/api.constants';

export class ApiPaginationDTO {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: API_CONSTANTS.DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: API_CONSTANTS.MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(API_CONSTANTS.MAX_PAGE_SIZE)
  pageSize?: number = API_CONSTANTS.DEFAULT_PAGE_SIZE;
}

export class ApiCursorPaginationDTO {
  @ApiPropertyOptional({ description: 'Opaque cursor for the next page' })
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Items to fetch', default: API_CONSTANTS.DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(API_CONSTANTS.MAX_PAGE_SIZE)
  take?: number = API_CONSTANTS.DEFAULT_PAGE_SIZE;
}
