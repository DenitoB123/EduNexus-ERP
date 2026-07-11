import { EventMiddlewareFn } from '../../interfaces/event.interface';
import { TenantContextService } from '../../../database/context/tenant-context.service';
import { AppLoggerService } from '../../../common/logger/app-logger.service';

/**
 * B2.7 — Event Middleware: Tenant Resolution.
 *
 * EventBus.emit already fills gaps via EventMetadataUtil.enrichFromContext
 * before dispatch. This middleware is the enforcement point that runs
 * inside the dispatch pipeline itself (so it also covers events pushed
 * directly into EventDispatcher.dispatch(), bypassing EventBus.emit,
 * e.g. from EventStoreService.replay()): it re-stamps tenantId from the
 * current context if still missing, and — the leakage guard — refuses
 * to let a handler run for an event whose tenantId doesn't match the
 * tenant of the request currently executing, when both are present and
 * differ. System-level events (no tenantId at all) are exempt.
 */
export function createTenantResolutionMiddleware(
  tenantContext: TenantContextService,
  logger: AppLoggerService,
): EventMiddlewareFn {
  return async (event, next) => {
    event.tenantId ??= tenantContext.getTenantId();

    const currentTenantId = tenantContext.getTenantId();
    if (event.tenantId && currentTenantId && event.tenantId !== currentTenantId) {
      logger.warn(
        `Blocked cross-tenant event dispatch: event "${event.eventName}" (${event.eventId}) belongs to tenant "${event.tenantId}" but current context is tenant "${currentTenantId}"`,
      );
      return;
    }

    await next();
  };
}
