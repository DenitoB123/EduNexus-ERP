import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { COMMON_DATABASE_CONSTANTS } from '../constants/database.constants';

export class BulkInsertDto<T> {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(COMMON_DATABASE_CONSTANTS.MAX_BULK_OPERATION_SIZE)
  items!: T[];
}

export class BulkUpsertItemDto<T> {
  @IsString()
  id!: string;

  createData!: T;
  updateData!: T;
}

export class BulkUpsertDto<T> {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(COMMON_DATABASE_CONSTANTS.MAX_BULK_OPERATION_SIZE)
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertItemDto)
  items!: BulkUpsertItemDto<T>[];
}

export class BulkRestoreDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(COMMON_DATABASE_CONSTANTS.MAX_BULK_OPERATION_SIZE)
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  reason?: string;
}
