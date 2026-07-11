import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventMiddlewareChain } from './event.middleware';
import { TenantContextService } from '../../database/context/tenant-context.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { createAuthContextMiddleware } from './middlewares/auth-context.middleware';
import { createTenantResolutionMiddleware } from './middlewares/tenant-resolution.middleware';
import { createValidationMiddleware } from './middlewares/validation.middleware';
import { createPerformanceMonitoringMiddleware } from './middlewares/performance-monitoring.middleware';

/**
 * B2.7 — Event Middleware bootstrap.
 *
 * EventMiddlewareChain (B1.3) registers its own logging middleware in
 * its constructor and exposes `use()` for anything else. Rather than
 * editing that constructor, this provider appends the B2.7 middlewares
 * once, on module init. EventMiddlewareChain.run() wraps middlewares in
 * the order they were added (first added = outermost), so the actual
 * execution order ends up:
 *
 *   logging (B1.3, outermost) -> auth-context -> tenant-resolution -> validation -> performance -> handlers (innermost)
 *
 * Auth/tenant context is stamped before validation and every middleware
 * after it, so they can rely on actorId/tenantId being populated.
 * Performance timing wraps only the handler fan-out itself (it's
 * innermost, right next to `terminal`), so a rejected/invalid event
 * never counts toward slow-dispatch metrics.
 */
@Injectable()
export class EventMiddlewareRegistrar implements OnModuleInit {
  constructor(
    private readonly middlewareChain: EventMiddlewareChain,
    private readonly tenantContext: TenantContextService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventMiddlewareRegistrar');
  }

  onModuleInit(): void {
    this.middlewareChain.use(createAuthContextMiddleware(this.tenantContext));
    this.middlewareChain.use(createTenantResolutionMiddleware(this.tenantContext, this.logger));
    this.middlewareChain.use(createValidationMiddleware(this.logger));
    this.middlewareChain.use(createPerformanceMonitoringMiddleware(this.logger));

    this.logger.log(
      'Registered B2.7 event middlewares (auth-context, tenant-resolution, validation, performance-monitoring)',
    );
  }
}
