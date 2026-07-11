import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { FilterCondition, FilterOperator } from '../../database/interfaces/base-model.interface';

export const Filtering = createParamDecorator((_: unknown, ctx: ExecutionContext): FilterCondition[] => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const filterParam = request.query.filter as Record<string, Record<string, string>> | undefined;

  if (!filterParam || typeof filterParam !== 'object') return [];

  const conditions: FilterCondition[] = [];

  for (const [field, operators] of Object.entries(filterParam)) {
    if (typeof operators !== 'object') continue;

    for (const [operator, value] of Object.entries(operators)) {
      conditions.push({ field, operator: operator as FilterOperator, value });
    }
  }

  return conditions;
});
