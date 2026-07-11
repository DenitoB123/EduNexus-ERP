import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQuery, IQueryBus, IQueryHandler, QueryType } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { IQueryPipelineBehavior } from '../interfaces/pipeline.interface';
import { QueryHandlerRegistry } from './query-handler.registry';
import { PipelineRunner } from '../pipelines/pipeline-runner.util';
import { QueryCachingBehavior } from '../pipelines/query-caching.behavior';
import { CQRS_QUERY_PIPELINE_BEHAVIORS } from '../constants/cqrs.constants';
import { BusinessException } from '../../exceptions/business.exception';

/**
 * Entry point for executing Queries. Mirrors `CommandBus` but ends the
 * pipeline in `QueryCachingBehavior.wrapExecute()` (cache lookup ->
 * handler -> cache write) rather than calling `handler.execute()`
 * directly, since caching needs the resolved handler instance (see
 * `pipelines/query-caching.behavior.ts`).
 */
@Injectable()
export class QueryBus implements IQueryBus {
  constructor(
    private readonly registry: QueryHandlerRegistry,
    private readonly cachingBehavior: QueryCachingBehavior,
    @Optional()
    @Inject(CQRS_QUERY_PIPELINE_BEHAVIORS)
    private readonly behaviors: IQueryPipelineBehavior[] = [],
  ) {}

  register<TQuery extends IQuery, TResult>(
    queryType: QueryType<TQuery>,
    handler: IQueryHandler<TQuery, TResult>,
  ): void {
    this.registry.register(queryType, handler);
  }

  async execute<TQuery extends IQuery, TResult = unknown>(
    query: TQuery,
    context: ICqrsExecutionContext,
  ): Promise<TResult> {
    const handler = this.registry.resolve<TQuery, TResult>(query);

    if (!handler) {
      throw new BusinessException(
        `No QueryHandler registered for "${query.queryName}". ` +
          'Did you forget @QueryHandler(...) on the handler provider, or forget to add it to a module\'s providers array?',
      );
    }

    return PipelineRunner.runQueryPipeline(this.behaviors, query, context, () =>
      this.cachingBehavior.wrapExecute(query, context, handler),
    );
  }
}
