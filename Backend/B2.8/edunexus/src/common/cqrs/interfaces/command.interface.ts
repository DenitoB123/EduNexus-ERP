import { ICqrsExecutionContext } from './cqrs-context.interface';

/**
 * Marker interface every command implements. `commandName` defaults to
 * the runtime constructor name (see `BaseCommand`) so handlers register
 * against a class reference rather than a hand-maintained string,
 * eliminating an entire class of "forgot to update the string" bugs.
 */
export interface ICommand {
  readonly commandId: string;
  readonly commandName: string;
  readonly issuedAt: Date;
}

/** Constructor type used to key the Command Handler registry. */
export type CommandType<TCommand extends ICommand = ICommand> = new (...args: any[]) => TCommand;

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand, context: ICqrsExecutionContext): Promise<TResult>;
}

export interface ICommandBus {
  execute<TCommand extends ICommand, TResult = void>(
    command: TCommand,
    context: ICqrsExecutionContext,
  ): Promise<TResult>;
  register<TCommand extends ICommand, TResult>(
    commandType: CommandType<TCommand>,
    handler: ICommandHandler<TCommand, TResult>,
  ): void;
}
