import { Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IQuery } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { IQueryPipelineBehavior, QueryNext } from '../interfaces/pipeline.interface';
import { IAuthorizationProvider } from '../interfaces/extension-points.interface';
import {
  REQUIRED_CQRS_PERMISSIONS_KEY,
  REQUIRED_CQRS_ROLES_KEY,
} from '../decorators/require-cqrs-access.decorator';
import { CQRS_AUTHORIZATION_PROVIDER } from '../constants/cqrs.constants';
import { AuthorizationException } from '../../exceptions/authorization.exception';
import { AppLoggerService } from '../../logger/app-logger.service';

/** Same metadata keys and degrade-to-warn behavior as `CommandAuthorizationBehavior`. */
@Injectable()
export class QueryAuthorizationBehavior implements IQueryPipelineBehavior {
  readonly name = 'QueryAuthorizationBehavior';

  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLoggerService,
    @Optional() @Inject(CQRS_AUTHORIZATION_PROVIDER) private readonly authProvider?: IAuthorizationProvider,
  ) {
    this.logger.setContext('QueryAuthorizationBehavior');
  }

  async handle<TQuery extends IQuery, TResult>(
    query: TQuery,
    context: ICqrsExecutionContext,
    next: QueryNext<TResult>,
  ): Promise<TResult> {
    const requiredRoles = this.reflector.get<string[] | undefined>(
      REQUIRED_CQRS_ROLES_KEY,
      query.constructor,
    );
    const requiredPermissions = this.reflector.get<string[] | undefined>(
      REQUIRED_CQRS_PERMISSIONS_KEY,
      query.constructor,
    );

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return next();
    }

    if (context.isAuthContextMissing) {
      this.logger.warn(
        `${query.queryName} requires roles/permissions but no auth context is present; allowing through pending the Auth module.`,
      );
      return next();
    }

    if (requiredRoles?.length) {
      const ok = this.authProvider
        ? await this.authProvider.hasRoles(context, requiredRoles)
        : requiredRoles.some((role) => context.roles?.includes(role));
      if (!ok) throw new AuthorizationException('read', query.queryName);
    }

    if (requiredPermissions?.length) {
      const ok = this.authProvider
        ? await this.authProvider.hasPermissions(context, requiredPermissions)
        : requiredPermissions.every((perm) => context.permissions?.includes(perm));
      if (!ok) throw new AuthorizationException('read', query.queryName);
    }

    return next();
  }
}
