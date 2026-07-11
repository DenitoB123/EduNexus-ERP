import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestMetadataValue {
  correlationId?: string;
  method: string;
  url: string;
  ip: string;
}

export const RequestMetadata = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestMetadataValue => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      correlationId: request.tenantContext?.correlationId,
      method: request.method,
      url: request.originalUrl,
      ip: request.ip ?? '',
    };
  },
);
