import { ICommand } from './command.interface';
import { IQuery } from './query.interface';
import { ICqrsExecutionContext } from './cqrs-context.interface';

export type CommandNext<TResult> = () => Promise<TResult>;
export type QueryNext<TResult> = () => Promise<TResult>;

/**
 * One link in the Command Bus's execution chain (logging, tenancy,
 * authorization, validation, transaction, ...). Behaviors call
 * `next()` to continue the chain, matching the same middleware-chain
 * shape already used by `EventMiddlewareChain`
 * (infrastructure/events/event.middleware.ts), so the two pipelines
 * read the same way.
 */
export interface ICommandPipelineBehavior {
  readonly name: string;
  handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    context: ICqrsExecutionContext,
    next: CommandNext<TResult>,
  ): Promise<TResult>;
}

export interface IQueryPipelineBehavior {
  readonly name: string;
  handle<TQuery extends IQuery, TResult>(
    query: TQuery,
    context: ICqrsExecutionContext,
    next: QueryNext<TResult>,
  ): Promise<TResult>;
}
