import { IQuery, IQueryHandler } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';

export abstract class QueryHandlerBase<TQuery extends IQuery, TResult = unknown>
  implements IQueryHandler<TQuery, TResult>
{
  abstract execute(query: TQuery, context: ICqrsExecutionContext): Promise<TResult>;

  getCacheKey?(query: TQuery, context: ICqrsExecutionContext): string | null;
  getCacheTtlSeconds?(): number;
}
