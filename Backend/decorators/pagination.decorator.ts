import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PaginationInput } from '../../database/interfaces/base-model.interface';

export const Pagination = createParamDecorator((_: unknown, ctx: ExecutionContext): PaginationInput => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const { page, pageSize } = request.query as Record<string, string | undefined>;

  return {
    page: page ? parseInt(page, 10) : undefined,
    pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
  };
});
