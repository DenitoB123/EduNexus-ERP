/**
 * base.service.ts
 *
 * B2.3 — Generic Service Layer — Base Service Classes
 *
 * Foundational abstract class every generic/business service extends
 * (directly, or via ReadOnlyService / CrudService / SoftDeleteService).
 * Wires together every cross-cutting concern the specification calls for:
 * repository access, tenant awareness, audit integration, business rules,
 * validation, lifecycle hooks, transactions, domain events, logging, and
 * standardized exceptions — so concrete business-module services only need
 * to supply entity-specific behavior (validators, business rules, hook
 * overrides).
 *
 * Business modules (B3+) extend one of the concrete subclasses in this
 * folder and pass their concrete IBaseRepository<TEntity> (from B2.2) plus
 * whatever infrastructure providers are available in their module, e.g.:
 *
 *   @Injectable()
 *   export class StudentService extends CrudService<Student, CreateStudentDto, UpdateStudentDto> {
 *     constructor(
 *       @Inject(STUDENT_REPOSITORY) repository: IBaseRepository<Student>,
 *       @Inject(TRANSACTION_MANAGER) transactionManager: ITransactionManager,
 *       @Inject(DOMAIN_EVENT_PUBLISHER) eventPublisher: IDomainEventPublisher,
 *       businessRulesEngine: BusinessRulesEngine,
 *       validationPipeline: ValidationPipeline,
 *       tenantService: TenantService,
 *       auditableService: AuditableService<Student>,
 *       @Optional() @Inject(APP_LOGGER) logger?: IAppLogger,
 *       @Optional() @Inject(EXCEPTION_FACTORY) exceptionFactory?: IExceptionFactory,
 *     ) {
 *       super('Student', repository, {
 *         transactionManager, eventPublisher, businessRulesEngine,
 *         validationPipeline, tenantService, auditableService, logger, exceptionFactory,
 *       });
 *     }
 *
 *     protected override async beforeCreate(data, context) { ... }
 *   }
 */

import { IBaseRepository } from '../interfaces/repository.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import { IAppLogger, IExceptionFactory } from '../interfaces/infrastructure.interfaces';
import { ITransactionManager } from '../transactions/transaction-manager.interface';
import { IDomainEventPublisher } from '../events/domain-event-publisher.interface';
import { IDomainEvent, DomainEventOperation } from '../events/domain-event.interface';
import { BusinessRulesEngine } from '../business-rules/business-rules-engine';
import { ValidationPipeline } from '../validators/validation-pipeline';
import { TenantService } from './tenant.service';
import { AuditableService } from './auditable.service';
import { IServiceHooks } from '../hooks/service-hooks.interface';
import { HookExecutor } from '../hooks/hook-executor';
import { EntityNotFoundException, ServiceValidationException } from '../exceptions/service.exceptions';

export interface IBaseServiceDependencies<TEntity> {
  transactionManager?: ITransactionManager;
  eventPublisher?: IDomainEventPublisher;
  businessRulesEngine?: BusinessRulesEngine;
  validationPipeline?: ValidationPipeline;
  tenantService?: TenantService;
  auditableService?: AuditableService<TEntity>;
  logger?: IAppLogger;
  exceptionFactory?: IExceptionFactory;
}

export abstract class BaseService<TEntity, TId = string> implements IServiceHooks<TEntity, Partial<TEntity>, Partial<TEntity>, TId> {
  protected readonly transactionManager?: ITransactionManager;
  protected readonly eventPublisher?: IDomainEventPublisher;
  protected readonly businessRulesEngine?: BusinessRulesEngine;
  protected readonly validationPipeline?: ValidationPipeline;
  protected readonly tenantService: TenantService;
  protected readonly auditableService: AuditableService<TEntity>;
  protected readonly logger?: IAppLogger;
  protected readonly exceptionFactory?: IExceptionFactory;
  protected readonly hookExecutor: HookExecutor;

  protected constructor(
    protected readonly entityName: string,
    protected readonly repository: IBaseRepository<TEntity, TId>,
    deps: IBaseServiceDependencies<TEntity> = {},
  ) {
    this.transactionManager = deps.transactionManager;
    this.eventPublisher = deps.eventPublisher;
    this.businessRulesEngine = deps.businessRulesEngine;
    this.validationPipeline = deps.validationPipeline;
    this.tenantService = deps.tenantService ?? new TenantService();
    this.auditableService = deps.auditableService ?? new AuditableService<TEntity>();
    this.logger = deps.logger;
    this.exceptionFactory = deps.exceptionFactory;
    this.hookExecutor = new HookExecutor(this.constructor.name, this.logger);
  }

  // ---------------------------------------------------------------------
  // Lifecycle hooks — default no-op implementations. Subclasses override
  // whichever they need; BaseService/CrudService invoke these via
  // hookExecutor.run(...) around every mutating operation.
  // ---------------------------------------------------------------------

  beforeCreate?(data: Partial<TEntity>, _context: IRequestContext): Partial<TEntity> | Promise<Partial<TEntity>> {
    return data;
  }
  afterCreate?(_entity: TEntity, _context: IRequestContext): void | Promise<void> {
    return undefined;
  }
  beforeUpdate?(
    _id: TId,
    data: Partial<TEntity>,
    _existing: TEntity,
    _context: IRequestContext,
  ): Partial<TEntity> | Promise<Partial<TEntity>> {
    return data;
  }
  afterUpdate?(_entity: TEntity, _previous: TEntity, _context: IRequestContext): void | Promise<void> {
    return undefined;
  }
  beforeDelete?(_id: TId, _existing: TEntity, _context: IRequestContext): void | Promise<void> {
    return undefined;
  }
  afterDelete?(_entity: TEntity, _context: IRequestContext): void | Promise<void> {
    return undefined;
  }
  beforeRestore?(_id: TId, _existing: TEntity, _context: IRequestContext): void | Promise<void> {
    return undefined;
  }
  afterRestore?(_entity: TEntity, _context: IRequestContext): void | Promise<void> {
    return undefined;
  }

  // ---------------------------------------------------------------------
  // Shared protected helpers
  // ---------------------------------------------------------------------

  /** Applies tenant scoping to a where-clause. Delegates to the composed TenantService. */
  protected applyTenantScope<T extends Record<string, unknown>>(where: T, context: IRequestContext): T {
    return this.tenantService.applyTenantScope(where, context);
  }

  /** Validates the current actor/tenant may access a resource belonging to resourceTenantId. */
  protected async validateTenantAccess(context: IRequestContext, resourceTenantId?: string): Promise<void> {
    await this.tenantService.validateTenantAccess(context, resourceTenantId);
  }

  /** Throws a standardized not-found exception, preferring the injected exception factory. */
  protected notFound(id: TId): never {
    throw this.exceptionFactory?.notFound(this.entityName, id) ?? new EntityNotFoundException(this.entityName, id);
  }

  /** Runs the business rules chained under `${entityName}.${operationKey}` for the given payload. */
  protected async runBusinessRules(operationKey: string, payload: unknown, context: IRequestContext): Promise<void> {
    if (!this.businessRulesEngine) return;
    await this.businessRulesEngine.execute(`${this.entityName}.${operationKey}`, payload, context);
  }

  /** Runs the validators registered for the given lifecycle stage. Throws on failure via exceptionFactory/ServiceValidationException. */
  protected async runValidation(
    stage: Parameters<ValidationPipeline['run']>[0],
    payload: unknown,
    context: IRequestContext,
  ): Promise<void> {
    if (!this.validationPipeline) return;
    const result = await this.validationPipeline.run(stage, payload, context);
    if (!result.valid) {
      const errorMap: Record<string, string[]> = {};
      for (const err of result.errors) {
        errorMap[err.field] = [...(errorMap[err.field] ?? []), err.message];
      }
      throw this.exceptionFactory?.validationFailed(errorMap) ?? new ServiceValidationException(errorMap);
    }
  }

  /** Publishes a domain event, if an event publisher has been wired. Never throws — logs and swallows publish errors so a downstream event-bus outage cannot fail the business operation. */
  protected async publishEvent(
    operation: DomainEventOperation,
    entityId: TId,
    payload: TEntity,
    context: IRequestContext,
    previousPayload?: TEntity,
  ): Promise<void> {
    if (!this.eventPublisher) return;
    const event: IDomainEvent<TEntity> = {
      eventName: `${this.entityName.toLowerCase()}.${operation}`,
      operation,
      entityName: this.entityName,
      entityId: entityId as unknown as string | number,
      tenantId: context.tenant.tenantId,
      actorId: context.actor.userId,
      occurredAt: new Date(),
      payload,
      previousPayload,
      correlationId: context.correlationId,
    };
    try {
      await this.eventPublisher.publish(event);
    } catch (error) {
      this.logger?.error(
        `Failed to publish domain event "${event.eventName}"`,
        error instanceof Error ? error.stack : undefined,
        this.constructor.name,
      );
    }
  }

  /** Runs `work` inside a transaction if a transactionManager is available; otherwise runs it directly. */
  protected async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (!this.transactionManager) {
      return work();
    }
    return this.transactionManager.runInTransaction(() => work());
  }

  protected logExecution(method: string, meta?: Record<string, unknown>): void {
    this.logger?.debug(`${this.entityName}.${method}`, this.constructor.name, meta);
  }
}
