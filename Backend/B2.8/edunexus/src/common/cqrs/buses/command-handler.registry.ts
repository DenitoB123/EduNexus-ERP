import { Injectable } from '@nestjs/common';
import { CommandType, ICommand, ICommandHandler } from '../interfaces/command.interface';

@Injectable()
export class CommandHandlerRegistry {
  private readonly handlers = new Map<CommandType<ICommand>, ICommandHandler<ICommand, unknown>>();

  register<TCommand extends ICommand, TResult>(
    commandType: CommandType<TCommand>,
    handler: ICommandHandler<TCommand, TResult>,
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(
        `Duplicate CommandHandler: "${commandType.name}" already has a registered handler. ` +
          'Each command may have exactly one handler.',
      );
    }
    this.handlers.set(commandType, handler as ICommandHandler<ICommand, unknown>);
  }

  resolve<TCommand extends ICommand, TResult>(
    command: TCommand,
  ): ICommandHandler<TCommand, TResult> | undefined {
    const commandType = command.constructor as CommandType<TCommand>;
    return this.handlers.get(commandType) as ICommandHandler<TCommand, TResult> | undefined;
  }

  listRegisteredCommandNames(): string[] {
    return Array.from(this.handlers.keys()).map((c) => c.name);
  }
}
