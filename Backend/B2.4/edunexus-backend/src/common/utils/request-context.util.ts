/**
 * request-context.util.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Bridges the HTTP layer to the B2.3 Generic Service Layer by building an
 * IRequestContext from the request populated by upstream auth/tenancy
 * infrastructure. This is the single place that translation happens, so
 * every generic controller/method produces an identical, consistent
 * context regardless of which business module uses it.
 */

import { IAuthenticatedRequest } from '../interfaces/controller.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import { ForbiddenServiceException } from '../exceptions/service.exceptions';

export function buildRequestContext(request: IAuthenticatedRequest): IRequestContext {
  if (!request.user) {
    throw new ForbiddenServiceException(
      'Request reached the Generic Controller Layer without an authenticated actor. ' +
        'Ensure authentication middleware/guards from the Auth infrastructure run upstream.',
    );
  }
  if (!request.tenant) {
    throw new ForbiddenServiceException(
      'Request reached the Generic Controller Layer without tenant context. ' +
        'Ensure tenancy middleware/guards from the Multi-tenancy infrastructure run upstream.',
    );
  }

  const correlationId =
    (request.headers['x-correlation-id'] as string | undefined) ??
    (request.headers['x-request-id'] as string | undefined);

  return {
    actor: request.user,
    tenant: request.tenant,
    correlationId,
    requestId: correlationId,
    timestamp: new Date(),
  };
}
