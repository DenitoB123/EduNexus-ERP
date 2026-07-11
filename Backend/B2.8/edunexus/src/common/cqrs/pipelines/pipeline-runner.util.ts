import { ICommand } from '../interfaces/command.interface';
import { IQuery } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import {
  CommandNext,
  ICommandPipelineBehavior,
  IQueryPipelineBehavior,
  QueryNext,
} from '../interfaces/pipeline.interface';

/**
 * Composes an ordered array of behaviors around a terminal function
 * into a single callable, right-to-left (the first behavior in the
 * array runs first and wraps everything after it) — the standard
 * "onion" middleware shape, matching
 * `infrastructure/events/event.middleware.ts`'s `EventMiddlewareChain`
 * (B1.3) so the three pipelines in this codebase (event, command,
 * query) all compose the same way.
 */
export class PipelineRunner {
  static runCommandPipeline<TCommand extends ICommand, TResult>(
    behaviors: ICommandPipelineBehavior[],
    command: TCommand,
    context: ICqrsExecutionContext,
    terminal: CommandNext<TResult>,
  ): Promise<TResult> {
    const chain = behaviors.reduceRight<CommandNext<TResult>>(
      (next, behavior) => () => behavior.handle(command, context, next),
      terminal,
    );
    return chain();
  }

  static runQueryPipeline<TQuery extends IQuery, TResult>(
    behaviors: IQueryPipelineBehavior[],
    query: TQuery,
    context: ICqrsExecutionContext,
    terminal: QueryNext<TResult>,
  ): Promise<TResult> {
    const chain = behaviors.reduceRight<QueryNext<TResult>>(
      (next, behavior) => () => behavior.handle(query, context, next),
      terminal,
    );
    return chain();
  }
}
