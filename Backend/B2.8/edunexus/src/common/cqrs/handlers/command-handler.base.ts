import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';

/**
 * Convenience base class for command handlers. Purely a typed
 * `implements` shortcut — all pipeline behavior (validation,
 * authorization, transactions, logging) happens in the Command Bus,
 * not here, so handlers stay focused on business logic only.
 */
export abstract class CommandHandlerBase<TCommand extends ICommand, TResult = void>
  implements ICommandHandler<TCommand, TResult>
{
  abstract execute(command: TCommand, context: ICqrsExecutionContext): Promise<TResult>;
}
