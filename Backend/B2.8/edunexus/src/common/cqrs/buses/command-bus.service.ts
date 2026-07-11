import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandType, ICommand, ICommandBus, ICommandHandler } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { ICommandPipelineBehavior } from '../interfaces/pipeline.interface';
import { CommandHandlerRegistry } from './command-handler.registry';
import { PipelineRunner } from '../pipelines/pipeline-runner.util';
import { CQRS_COMMAND_PIPELINE_BEHAVIORS } from '../constants/cqrs.constants';
import { BusinessException } from '../../exceptions/business.exception';

/**
 * Entry point for executing Commands. Controllers (and, later,
 * message consumers / scheduled jobs) call `commandBus.execute(cmd,
 * context)` instead of invoking a service method directly, so every
 * command automatically goes through logging, tenancy, authorization,
 * validation, and (for `TransactionalCommand`s) a managed transaction
 * — without any of that being duplicated inside individual handlers
 * or controllers.
 *
 * Handlers are auto-registered by `CommandHandlerExplorer` on
 * `onModuleInit`; nothing needs to call `register()` manually except
 * tests.
 */
@Injectable()
export class CommandBus implements ICommandBus {
  constructor(
    private readonly registry: CommandHandlerRegistry,
    @Optional()
    @Inject(CQRS_COMMAND_PIPELINE_BEHAVIORS)
    private readonly behaviors: ICommandPipelineBehavior[] = [],
  ) {}

  register<TCommand extends ICommand, TResult>(
    commandType: CommandType<TCommand>,
    handler: ICommandHandler<TCommand, TResult>,
  ): void {
    this.registry.register(commandType, handler);
  }

  async execute<TCommand extends ICommand, TResult = void>(
    command: TCommand,
    context: ICqrsExecutionContext,
  ): Promise<TResult> {
    const handler = this.registry.resolve<TCommand, TResult>(command);

    if (!handler) {
      throw new BusinessException(
        `No CommandHandler registered for "${command.commandName}". ` +
          'Did you forget @CommandHandler(...) on the handler provider, or forget to add it to a module\'s providers array?',
      );
    }

    return PipelineRunner.runCommandPipeline(this.behaviors, command, context, () =>
      handler.execute(command, context),
    );
  }
}
