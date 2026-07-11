import { PaginationMeta } from '../../response/response.interface';

export class ResponseDto<T> {
  success: boolean;
  data: T;
  message: string;

  constructor(data: T, message = 'Success') {
    this.success = true;
    this.data = data;
    this.message = message;
  }

  static ok<T>(data: T, message = 'Success'): ResponseDto<T> {
    return new ResponseDto(data, message);
  }
}

export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: PaginationMeta;

  constructor(data: T[], meta: PaginationMeta, message = 'Success') {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static of<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success',
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
    return new PaginatedResponseDto(data, meta, message);
  }
}
