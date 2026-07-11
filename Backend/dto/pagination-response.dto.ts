import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDTO } from './api-response.dto';

export class PaginationResponseDto<T> {
  @ApiProperty({ isArray: true })
  items!: T[];

  @ApiProperty({ type: PaginationMetaDTO })
  meta!: PaginationMetaDTO;
}
