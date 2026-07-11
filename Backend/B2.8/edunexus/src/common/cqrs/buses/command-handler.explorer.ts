import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { CommandHandlerRegistry } from './command-handler.registry';
import { COMMAND_HANDLER_METADATA } from '../constants/cqrs.constants';
import { CommandType, ICommand, ICommandHandler } from '../interfaces/command.interface';
import { AppLoggerService } from '../../logger/app-logger.service';

/**
 * Discovers every provider decorated with `@CommandHandler(SomeCommand)`
 * on module bootstrap and registers it with the `CommandHandlerRegistry`.
 * Structurally the same discovery approach as
 * `infrastructure/events/event-subscriber.explorer.ts` (B1.3) — class-
 * level metadata instead of method-level, since a command handler is a
 * whole provider rather than one method among several.
 */
@Injectable()
export class CommandHandlerExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly registry: CommandHandlerRegistry,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('CommandHandlerExplorer');
  }

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const commandType = this.reflector.get<CommandType<ICommand> | undefined>(
        COMMAND_HANDLER_METADATA,
        metatype,
      );
      if (!commandType) continue;

      this.registry.register(commandType, instance as ICommandHandler<ICommand, unknown>);
      this.logger.log(`Registered "${metatype.name}" as handler for command "${commandType.name}"`);
    }
  }
}
