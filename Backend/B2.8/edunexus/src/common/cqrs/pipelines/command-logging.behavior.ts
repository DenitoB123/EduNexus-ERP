import { Injectable } from '@nestjs/common';
import { ICommand } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { CommandNext, ICommandPipelineBehavior } from '../interfaces/pipeline.interface';
import { AppLoggerService } from '../../logger/app-logger.service';

@Injectable()
export class CommandLoggingBehavior implements ICommandPipelineBehavior {
  readonly name = 'CommandLoggingBehavior';

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('CommandBus');
  }

  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    context: ICqrsExecutionContext,
    next: CommandNext<TResult>,
  ): Promise<TResult> {
    const startedAt = Date.now();
    this.logger.log(
      `-> ${command.commandName} [${command.commandId}] correlationId=${context.correlationId}`,
    );

    try {
      const result = await next();
      this.logger.log(`<- ${command.commandName} [${command.commandId}] ${Date.now() - startedAt}ms`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `x  ${command.commandName} [${command.commandId}] failed after ${Date.now() - startedAt}ms: ${message}`,
      );
      throw error;
    }
  }
}
