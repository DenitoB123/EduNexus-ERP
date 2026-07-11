import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

export interface ApiEndpointOptions {
  summary: string;
  description?: string;
  tags?: string[];
  httpCode?: HttpStatus;
}

export const ApiEndpoint = (options: ApiEndpointOptions): MethodDecorator =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({ summary: options.summary, description: options.description }),
    HttpCode(options.httpCode ?? HttpStatus.OK),
  );

export const ApiPublicEndpoint = (options: Omit<ApiEndpointOptions, 'httpCode'>): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiResponse({ status: 200, description: 'Success' }),
  );

export const ApiPaginatedResponse = (status = 200): MethodDecorator =>
  applyDecorators(
    ApiResponse({ status, description: 'Paginated list response' }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'pageSize', required: false, type: Number }),
    ApiQuery({ name: 'sort', required: false, type: String, description: 'e.g. "createdAt:desc,name:asc"' }),
    ApiQuery({ name: 'q', required: false, type: String, description: 'Full-text search query' }),
    ApiQuery({ name: 'fields', required: false, type: String, description: 'Comma-separated search fields' }),
  );

export const ApiUuidParam = (name = 'id', description = 'Resource UUID'): MethodDecorator =>
  applyDecorators(
    ApiParam({ name, description, format: 'uuid', type: String }),
  );

export const ApiCommonResponses = (): MethodDecorator =>
  applyDecorators(
    ApiResponse({ status: 400, description: 'Bad Request — validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid Bearer token' }),
    ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' }),
    ApiResponse({ status: 404, description: 'Not Found — resource does not exist in this tenant' }),
    ApiResponse({ status: 429, description: 'Too Many Requests — rate limit exceeded' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  );

export const ApiResourceTag = (tag: string): ClassDecorator => applyDecorators(ApiTags(tag));
