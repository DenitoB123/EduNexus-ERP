import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiHeader } from '@nestjs/swagger';

export interface ApiMetadataOptions {
  summary: string;
  description?: string;
}

export const ApiMetadata = (options: ApiMetadataOptions): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiHeader({
      name: 'x-correlation-id',
      required: false,
      description: 'Optional client-supplied correlation id, echoed back for tracing',
    }),
  );
