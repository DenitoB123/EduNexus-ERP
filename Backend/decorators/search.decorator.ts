import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { SearchInput } from '../../database/interfaces/base-model.interface';

export const Search = createParamDecorator((_: unknown, ctx: ExecutionContext): SearchInput | undefined => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const { q, fields } = request.query as Record<string, string | undefined>;

  if (!q) return undefined;

  return {
    query: q,
    fields: fields ? fields.split(',').map((f) => f.trim()) : [],
  };
});
