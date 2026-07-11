import { Injectable } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryType } from '../interfaces/query.interface';

@Injectable()
export class QueryHandlerRegistry {
  private readonly handlers = new Map<QueryType<IQuery>, IQueryHandler<IQuery, unknown>>();

  register<TQuery extends IQuery, TResult>(
    queryType: QueryType<TQuery>,
    handler: IQueryHandler<TQuery, TResult>,
  ): void {
    if (this.handlers.has(queryType)) {
      throw new Error(
        `Duplicate QueryHandler: "${queryType.name}" already has a registered handler. ` +
          'Each query may have exactly one handler.',
      );
    }
    this.handlers.set(queryType, handler as IQueryHandler<IQuery, unknown>);
  }

  resolve<TQuery extends IQuery, TResult>(query: TQuery): IQueryHandler<TQuery, TResult> | undefined {
    const queryType = query.constructor as QueryType<TQuery>;
    return this.handlers.get(queryType) as IQueryHandler<TQuery, TResult> | undefined;
  }

  listRegisteredQueryNames(): string[] {
    return Array.from(this.handlers.keys()).map((q) => q.name);
  }
}
