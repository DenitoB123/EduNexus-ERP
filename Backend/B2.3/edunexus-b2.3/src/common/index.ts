/**
 * index.ts — B2.3 Generic Service Layer barrel export
 *
 * Business modules should import from this barrel (or the sub-paths
 * directly) rather than reaching into individual files, e.g.:
 *
 *   import { CrudService, IRequestContext, BusinessRulesEngine } from '@app/common';
 */

// Interfaces
export * from './interfaces/context.interfaces';
export * from './interfaces/tokens';
export * from './interfaces/repository.interfaces';
export * from './interfaces/service.interfaces';
export * from './interfaces/infrastructure.interfaces';

// Responses
export * from './responses/service-response';

// Hooks
export * from './hooks/service-hooks.interface';
export * from './hooks/hook-executor';

// Business rules
export * from './business-rules/business-rule.interface';
export * from './business-rules/business-rule.exception';
export * from './business-rules/business-rules-engine';

// Validators
export * from './validators/validation.interface';
export * from './validators/validation-pipeline';
export * from './validators/common-validators';

// Transactions
export * from './transactions/transaction-manager.interface';
export * from './transactions/transactional.decorator';

// Domain events
export * from './events/domain-event.interface';
export * from './events/domain-event-publisher.interface';

// Exceptions
export * from './exceptions/service.exceptions';

// Utils
export * from './utils/pagination.util';
export * from './utils/query-options.util';

// Services
export * from './services/base.service';
export * from './services/read-only.service';
export * from './services/crud.service';
export * from './services/soft-delete.service';
export * from './services/tenant.service';
export * from './services/auditable.service';
