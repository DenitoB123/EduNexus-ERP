/**
 * api-response.dto.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Swagger-documented response envelope classes. These mirror the runtime
 * shapes produced by B2.3's ServiceResponse / PaginatedResponse /
 * BulkOperationResponse (see ../../services/../responses/service-response.ts)
 * but exist separately as `class`es (not just interfaces) because
 * @nestjs/swagger needs real classes with @ApiProperty decorators to
 * generate OpenAPI schemas — reusing them via ApiExtraModels +
 * getSchemaPath keeps every controller's docs consistent.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiValidationErrorDto {
  @ApiProperty() field!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() code?: string;
}

export class ApiSuccessResponseDto<T = unknown> {
  @ApiProperty({ example: true }) success!: true;
  @ApiPropertyOptional() data?: T;
  @ApiPropertyOptional() message?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) meta?: Record<string, unknown>;
  @ApiProperty({ type: String, format: 'date-time' }) timestamp!: Date;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false }) success!: false;
  @ApiProperty() message!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional({ type: [ApiValidationErrorDto] }) errors?: ApiValidationErrorDto[];
  @ApiProperty({ type: String, format: 'date-time' }) timestamp!: Date;
  @ApiPropertyOptional() correlationId?: string;
}

export class ApiPaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class ApiPaginatedResponseDto<T = unknown> {
  @ApiProperty({ example: true }) success!: true;
  @ApiPropertyOptional() data!: T[];
  @ApiProperty({ type: ApiPaginationMetaDto }) pagination!: ApiPaginationMetaDto;
  @ApiProperty({ type: String, format: 'date-time' }) timestamp!: Date;
}

export class ApiCursorPaginatedResponseDto<T = unknown> {
  @ApiProperty({ example: true }) success!: true;
  @ApiPropertyOptional() data!: T[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true }) nextCursor!: Record<string, unknown> | null;
  @ApiProperty() hasMore!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) timestamp!: Date;
}

export class ApiBulkOperationErrorDto {
  @ApiProperty() index!: number;
  @ApiPropertyOptional() identifier?: unknown;
  @ApiProperty() message!: string;
}

export class ApiBulkOperationResponseDto<T = unknown> {
  @ApiProperty() success!: boolean;
  @ApiProperty() processedCount!: number;
  @ApiProperty() successCount!: number;
  @ApiProperty() failureCount!: number;
  @ApiPropertyOptional() results!: T[];
  @ApiProperty({ type: [ApiBulkOperationErrorDto] }) errors!: ApiBulkOperationErrorDto[];
  @ApiProperty({ type: String, format: 'date-time' }) timestamp!: Date;
}
