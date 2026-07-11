import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { IQuery } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { IQueryPipelineBehavior, QueryNext } from '../interfaces/pipeline.interface';
import { ValidationException } from '../../exceptions/validation.exception';

/**
 * Structural validation only, same rationale as
 * `CommandValidationBehavior` — queries that add `class-validator`
 * decorators to their own properties (e.g. a `@Min(1)` on a page
 * number) get them enforced here; queries with none pass trivially.
 * There is no "business rule validation" concept on the read side —
 * queries don't mutate state, so B2.3's business-rule extension point
 * is command-only.
 */
@Injectable()
export class QueryValidationBehavior implements IQueryPipelineBehavior {
  readonly name = 'QueryValidationBehavior';

  async handle<TQuery extends IQuery, TResult>(
    query: TQuery,
    context: ICqrsExecutionContext,
    next: QueryNext<TResult>,
  ): Promise<TResult> {
    const errors = await validate(query as object, { whitelist: false, forbidUnknownValues: false });

    if (errors.length > 0) {
      const details = errors.map((e) => ({ property: e.property, constraints: e.constraints }));
      throw new ValidationException(`${query.queryName} failed structural validation`, details);
    }

    return next();
  }
}
