import { randomUUID } from 'crypto';
import { EventMiddlewareFn } from '../../interfaces/event.interface';
import { TenantContextService } from '../../../database/context/tenant-context.service';

/**
 * B2.7 — Event Middleware: Authentication Context.
 *
 * Ensures every event carries an actorId (who caused this — falls back
 * to 'system' for background/job-originated events) and a traceId, so
 * downstream consumers (audit trail, log correlation) never have to
 * special-case "unknown actor".
 */
export function createAuthContextMiddleware(
  tenantContext: TenantContextService,
): EventMiddlewareFn {
  return async (event, next) => {
    event.actorId ??= tenantContext.getActorId() ?? 'system';
    event.correlationId ??= tenantContext.getCorrelationId() ?? randomUUID();
    event.traceId ??= event.correlationId;

    await next();
  };
}
