import { Injectable } from '@nestjs/common';
import { ICommand } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { CommandNext, ICommandPipelineBehavior } from '../interfaces/pipeline.interface';
import { TenantCommand } from '../commands/tenant.command';
import { TenantException } from '../../exceptions/tenant.exception';

/**
 * Enforces the same tenant-isolation guarantee `TenantRepository`
 * (B2.2) enforces at the data layer, but at the command boundary,
 * before a handler ever runs — so a handler never has to defensively
 * re-check that a `TenantCommand`'s `tenantId` matches the caller's
 * context.
 */
@Injectable()
export class CommandTenancyBehavior implements ICommandPipelineBehavior {
  readonly name = 'CommandTenancyBehavior';

  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    context: ICqrsExecutionContext,
    next: CommandNext<TResult>,
  ): Promise<TResult> {
    if (command instanceof TenantCommand) {
      if (!command.tenantId) {
        throw new TenantException('A TenantCommand was dispatched without a tenantId');
      }
      if (context.tenantId && context.tenantId !== command.tenantId) {
        throw new TenantException(
          `Command tenantId "${command.tenantId}" does not match execution context tenantId "${context.tenantId}"`,
        );
      }
    }

    return next();
  }
}
