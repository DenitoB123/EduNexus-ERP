import { Injectable } from '@nestjs/common';
import { IQuery } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { IQueryPipelineBehavior, QueryNext } from '../interfaces/pipeline.interface';
import { TenantQuery } from '../queries/tenant.query';
import { TenantException } from '../../exceptions/tenant.exception';

@Injectable()
export class QueryTenancyBehavior implements IQueryPipelineBehavior {
  readonly name = 'QueryTenancyBehavior';

  async handle<TQuery extends IQuery, TResult>(
    query: TQuery,
    context: ICqrsExecutionContext,
    next: QueryNext<TResult>,
  ): Promise<TResult> {
    if (query instanceof TenantQuery) {
      if (!query.tenantId) {
        throw new TenantException('A TenantQuery was dispatched without a tenantId');
      }
      if (context.tenantId && context.tenantId !== query.tenantId) {
        throw new TenantException(
          `Query tenantId "${query.tenantId}" does not match execution context tenantId "${context.tenantId}"`,
        );
      }
    }

    return next();
  }
}
