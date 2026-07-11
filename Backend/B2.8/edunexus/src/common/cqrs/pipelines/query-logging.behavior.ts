import { Injectable } from '@nestjs/common';
import { IQuery } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { IQueryPipelineBehavior, QueryNext } from '../interfaces/pipeline.interface';
import { AppLoggerService } from '../../logger/app-logger.service';

@Injectable()
export class QueryLoggingBehavior implements IQueryPipelineBehavior {
  readonly name = 'QueryLoggingBehavior';

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('QueryBus');
  }

  async handle<TQuery extends IQuery, TResult>(
    query: TQuery,
    context: ICqrsExecutionContext,
    next: QueryNext<TResult>,
  ): Promise<TResult> {
    const startedAt = Date.now();
    this.logger.debug(`-> ${query.queryName} [${query.queryId}] correlationId=${context.correlationId}`);

    try {
      const result = await next();
      this.logger.debug(`<- ${query.queryName} [${query.queryId}] ${Date.now() - startedAt}ms`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `x  ${query.queryName} [${query.queryId}] failed after ${Date.now() - startedAt}ms: ${message}`,
      );
      throw error;
    }
  }
}
