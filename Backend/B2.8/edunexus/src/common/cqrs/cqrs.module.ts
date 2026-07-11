import { Global, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { CommandBus } from './buses/command-bus.service';
import { QueryBus } from './buses/query-bus.service';
import { CommandHandlerRegistry } from './buses/command-handler.registry';
import { QueryHandlerRegistry } from './buses/query-handler.registry';
import { CommandHandlerExplorer } from './buses/command-handler.explorer';
import { QueryHandlerExplorer } from './buses/query-handler.explorer';

import { CommandLoggingBehavior } from './pipelines/command-logging.behavior';
import { CommandTenancyBehavior } from './pipelines/command-tenancy.behavior';
import { CommandAuthorizationBehavior } from './pipelines/command-authorization.behavior';
import { CommandValidationBehavior } from './pipelines/command-validation.behavior';
import { CommandTransactionBehavior } from './pipelines/command-transaction.behavior';

import { QueryLoggingBehavior } from './pipelines/query-logging.behavior';
import { QueryTenancyBehavior } from './pipelines/query-tenancy.behavior';
import { QueryAuthorizationBehavior } from './pipelines/query-authorization.behavior';
import { QueryValidationBehavior } from './pipelines/query-validation.behavior';
import { QueryCachingBehavior } from './pipelines/query-caching.behavior';

import { ProjectionIdempotencyGuard } from './projections/projection-idempotency.guard';
import { CqrsTransactionContextService } from './utils/cqrs-transaction-context.service';
import { CqrsContextFactory } from './utils/cqrs-context.factory';

import {
  CQRS_BUSINESS_RULE_VALIDATORS,
  CQRS_COMMAND_PIPELINE_BEHAVIORS,
  CQRS_QUERY_PIPELINE_BEHAVIORS,
} from './constants/cqrs.constants';

/**
 * `CQRS_AUTHORIZATION_PROVIDER` is deliberately NOT provided here —
 * it's `@Optional()` everywhere it's injected
 * (`CommandAuthorizationBehavior`, `QueryAuthorizationBehavior`), so
 * the absence of a provider is the expected, working state until
 * B2.6 registers one. Providing a no-op stub here would be
 * indistinguishable from "not implemented yet" at the type level but
 * would hide that fact — an `@Optional()` `undefined` is more honest.
 */
const businessRuleValidatorsProvider: Provider = {
  provide: CQRS_BUSINESS_RULE_VALIDATORS,
  useValue: [],
};

const commandPipelineBehaviorsProvider: Provider = {
  provide: CQRS_COMMAND_PIPELINE_BEHAVIORS,
  useFactory: (
    logging: CommandLoggingBehavior,
    tenancy: CommandTenancyBehavior,
    authorization: CommandAuthorizationBehavior,
    validation: CommandValidationBehavior,
    transaction: CommandTransactionBehavior,
  ) => [logging, tenancy, authorization, validation, transaction],
  inject: [
    CommandLoggingBehavior,
    CommandTenancyBehavior,
    CommandAuthorizationBehavior,
    CommandValidationBehavior,
    CommandTransactionBehavior,
  ],
};

const queryPipelineBehaviorsProvider: Provider = {
  provide: CQRS_QUERY_PIPELINE_BEHAVIORS,
  useFactory: (
    logging: QueryLoggingBehavior,
    tenancy: QueryTenancyBehavior,
    authorization: QueryAuthorizationBehavior,
    validation: QueryValidationBehavior,
  ) => [logging, tenancy, authorization, validation],
  inject: [QueryLoggingBehavior, QueryTenancyBehavior, QueryAuthorizationBehavior, QueryValidationBehavior],
};

/**
 * Enterprise CQRS Infrastructure (B2.8). `@Global()` so `CommandBus`/
 * `QueryBus` are injectable anywhere without every feature module
 * re-importing `CqrsModule`, matching `EventModule`'s (B1.3)
 * precedent for cross-cutting infrastructure.
 *
 * Business modules (B3+) register their own `@CommandHandler(...)`/
 * `@QueryHandler(...)` providers in their own feature module's
 * `providers` array — `CommandHandlerExplorer`/`QueryHandlerExplorer`
 * discover them via `DiscoveryModule` regardless of which module
 * declared them, so `CqrsModule` never needs to import a business
 * module to know its handlers exist.
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    CommandBus,
    QueryBus,
    CommandHandlerRegistry,
    QueryHandlerRegistry,
    CommandHandlerExplorer,
    QueryHandlerExplorer,

    CommandLoggingBehavior,
    CommandTenancyBehavior,
    CommandAuthorizationBehavior,
    CommandValidationBehavior,
    CommandTransactionBehavior,

    QueryLoggingBehavior,
    QueryTenancyBehavior,
    QueryAuthorizationBehavior,
    QueryValidationBehavior,
    QueryCachingBehavior,

    ProjectionIdempotencyGuard,
    CqrsTransactionContextService,
    CqrsContextFactory,

    businessRuleValidatorsProvider,
    commandPipelineBehaviorsProvider,
    queryPipelineBehaviorsProvider,
  ],
  exports: [
    CommandBus,
    QueryBus,
    CqrsContextFactory,
    CqrsTransactionContextService,
    ProjectionIdempotencyGuard,
  ],
})
export class CqrsModule {}
