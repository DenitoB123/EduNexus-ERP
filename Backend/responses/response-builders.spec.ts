import { SuccessResponseBuilder } from './success-response.builder';
import { ErrorResponseBuilder } from './error-response.builder';
import { PaginationResponseBuilder } from './pagination-response.builder';
import { ERROR_CODES } from '../constants/error-codes.constants';

describe('SuccessResponseBuilder', () => {
  it('builds a success envelope with default status 200', () => {
    const response = SuccessResponseBuilder.build({ id: '1' }, '/api/v1/things');
    expect(response.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ id: '1' });
    expect(response.path).toBe('/api/v1/things');
  });
});

describe('ErrorResponseBuilder', () => {
  it('builds an error envelope from a known error code', () => {
    const response = ErrorResponseBuilder.fromCode(
      '/api/v1/things/1',
      404,
      ERROR_CODES.RESOURCE_NOT_FOUND,
      'Thing not found',
    );
    expect(response.success).toBe(false);
    expect(response.error).toBe('RESOURCE_NOT_FOUND');
    expect(response.statusCode).toBe(404);
  });
});

describe('PaginationResponseBuilder', () => {
  it('wraps a paginated result in the standard success envelope', () => {
    const result = {
      items: [1, 2, 3],
      meta: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };
    const response = PaginationResponseBuilder.build(result, '/api/v1/things');
    expect(response.data.items).toEqual([1, 2, 3]);
    expect(response.success).toBe(true);
  });
});
