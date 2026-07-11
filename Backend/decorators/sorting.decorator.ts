import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { SortInput } from '../../database/interfaces/base-model.interface';

export const Sorting = createParamDecorator((_: unknown, ctx: ExecutionContext): SortInput[] => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const raw = (request.query.sort as string | undefined) ?? '';

  if (!raw) return [];

  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [field, order] = part.split(':');
      return { field, order: order === 'desc' ? 'desc' : 'asc' };
    });
});
