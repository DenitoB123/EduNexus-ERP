import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { COMMON_DATABASE_CONSTANTS } from '../constants/database.constants';

export class BulkDeleteDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(COMMON_DATABASE_CONSTANTS.MAX_BULK_OPERATION_SIZE)
  @IsString({ each: true })
  ids!: string[];
}

export class BulkUpdateItemDTO<T> {
  @IsString()
  id!: string;

  data!: T;
}

export class BulkUpdateDTO<T> {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(COMMON_DATABASE_CONSTANTS.MAX_BULK_OPERATION_SIZE)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDTO)
  items!: BulkUpdateItemDTO<T>[];
}
