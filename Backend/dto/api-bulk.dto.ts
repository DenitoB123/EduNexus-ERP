import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';
import { API_RESPONSE_CONSTANTS } from '../constants/api.constants';

export class ApiBulkDeleteDTO {
  @ApiProperty({
    description: 'Array of IDs to delete',
    type: [String],
    maxItems: API_RESPONSE_CONSTANTS.BULK_MAX_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(API_RESPONSE_CONSTANTS.BULK_MAX_ITEMS)
  @IsString({ each: true })
  ids!: string[];
}

export class ApiBulkOperationResultDTO<T> {
  @ApiProperty({ description: 'Successfully processed items' })
  succeeded!: T[];

  @ApiProperty({ description: 'Failed items with error detail' })
  failed!: Array<{ index: number; error: string }>;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failureCount!: number;
}

export class ApiBulkValidationDTO {
  @ApiPropertyOptional({ description: 'Stop on first failure', default: false })
  @IsOptional()
  failFast?: boolean = false;
}
