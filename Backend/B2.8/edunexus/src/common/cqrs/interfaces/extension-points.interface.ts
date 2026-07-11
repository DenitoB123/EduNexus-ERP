import { ICommand } from './command.interface';
import { ICqrsExecutionContext } from './cqrs-context.interface';

/**
 * Extension point for the business-rule validation framework planned
 * for B2.3. B2.8 deliberately does NOT implement business-rule
 * validation itself — `CommandValidationBehavior` only runs
 * structural (class-validator/DTO-shape) validation, which already
 * exists in this codebase (`common/pipes/validation.pipe.ts`,
 * `common/validators/*`, B1/B2.1).
 *
 * Once B2.3 lands, register any number of `IBusinessRuleValidator`
 * providers under the `CQRS_BUSINESS_RULE_VALIDATORS` multi-provider
 * token (see `cqrs.module.ts`) and `CommandValidationBehavior` will
 * pick them up automatically — no changes to the bus or pipeline are
 * needed.
 */
export interface IBusinessRuleValidator<TCommand extends ICommand = ICommand> {
  /** Returning true means this validator applies to the given command. */
  supports(command: ICommand): command is TCommand;
  /** Throw a `BusinessException`/`ValidationException` (or subclass) to fail the command. */
  validate(command: TCommand, context: ICqrsExecutionContext): Promise<void>;
}

/**
 * Extension point for turning a domain event into a read-model delta.
 * `ProjectionHandlerBase` subclasses may use this instead of hand-
 * rolling entity->read-model field mapping. A richer mapping
 * framework (B2.4) can supply implementations backed by declarative
 * profiles; until then, subclasses can implement this inline or reuse
 * the existing `IMapper` (`common/mappers/mapper.interface.ts`) for
 * the entity/read-model shapes that already have one.
 */
export interface IProjectionMapper<TEvent, TReadModel> {
  map(event: TEvent, previous: TReadModel | null): TReadModel | Promise<TReadModel>;
}

/**
 * Extension point for full RBAC (role+permission resolution against a
 * persisted user, not just whatever is already on
 * `request.authContext`). `CommandAuthorizationBehavior`/
 * `QueryAuthorizationBehavior` consult this when present; when no
 * provider is registered they fall back to the same
 * context.roles/permissions-array check the existing
 * `RolesGuard`/`PermissionsGuard` perform, and log-and-allow when
 * even that is absent — identical degrade behavior to those guards,
 * for consistency.
 */
export interface IAuthorizationProvider {
  hasPermissions(context: ICqrsExecutionContext, permissions: string[]): Promise<boolean>;
  hasRoles(context: ICqrsExecutionContext, roles: string[]): Promise<boolean>;
}
