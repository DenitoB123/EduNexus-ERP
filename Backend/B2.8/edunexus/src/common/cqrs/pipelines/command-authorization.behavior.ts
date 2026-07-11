import { Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ICommand } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { CommandNext, ICommandPipelineBehavior } from '../interfaces/pipeline.interface';
import { IAuthorizationProvider } from '../interfaces/extension-points.interface';
import {
  REQUIRED_CQRS_PERMISSIONS_KEY,
  REQUIRED_CQRS_ROLES_KEY,
} from '../decorators/require-cqrs-access.decorator';
import { CQRS_AUTHORIZATION_PROVIDER } from '../constants/cqrs.constants';
import { AuthorizationException } from '../../exceptions/authorization.exception';
import { AppLoggerService } from '../../logger/app-logger.service';

/**
 * Reads `@RequireRolesForCqrs`/`@RequirePermissionsForCqrs`
 * metadata off the command class. When a full `IAuthorizationProvider`
 * (B2.6) is registered, it's consulted; otherwise this behavior falls
 * back to `context.roles`/`context.permissions`, and — matching
 * `RolesGuard`/`PermissionsGuard`'s existing "no Auth module yet"
 * behavior exactly — logs a warning and allows the command through
 * when the context has no auth info at all, rather than blocking
 * every command in a codebase that doesn't have an Auth module wired
 * up yet.
 */
@Injectable()
export class CommandAuthorizationBehavior implements ICommandPipelineBehavior {
  readonly name = 'CommandAuthorizationBehavior';

  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLoggerService,
    @Optional() @Inject(CQRS_AUTHORIZATION_PROVIDER) private readonly authProvider?: IAuthorizationProvider,
  ) {
    this.logger.setContext('CommandAuthorizationBehavior');
  }

  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    context: ICqrsExecutionContext,
    next: CommandNext<TResult>,
  ): Promise<TResult> {
    const requiredRoles = this.reflector.get<string[] | undefined>(
      REQUIRED_CQRS_ROLES_KEY,
      command.constructor,
    );
    const requiredPermissions = this.reflector.get<string[] | undefined>(
      REQUIRED_CQRS_PERMISSIONS_KEY,
      command.constructor,
    );

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return next();
    }

    if (context.isAuthContextMissing) {
      this.logger.warn(
        `${command.commandName} requires roles/permissions but no auth context is present; ` +
          'allowing through pending the Auth module (same fallback as RolesGuard/PermissionsGuard).',
      );
      return next();
    }

    if (requiredRoles?.length) {
      const ok = this.authProvider
        ? await this.authProvider.hasRoles(context, requiredRoles)
        : requiredRoles.some((role) => context.roles?.includes(role));
      if (!ok) {
        throw new AuthorizationException('execute', command.commandName);
      }
    }

    if (requiredPermissions?.length) {
      const ok = this.authProvider
        ? await this.authProvider.hasPermissions(context, requiredPermissions)
        : requiredPermissions.every((perm) => context.permissions?.includes(perm));
      if (!ok) {
        throw new AuthorizationException('execute', command.commandName);
      }
    }

    return next();
  }
}
