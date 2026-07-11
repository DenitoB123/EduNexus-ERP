/**
 * Domain exception hierarchy — Milestone 1.7.
 *
 * Does NOT replace AllExceptionsFilter / HttpExceptionFilter / the Prisma
 * error mapping already in src/common/filters (Milestone 1.1). Those stay
 * as the outermost HTTP-layer safety net. These classes give service-layer
 * code a way to throw *meaningful, typed* business errors — instead of
 * generic NestJS HttpExceptions or bare `throw new Error(...)` — that:
 *   - carry a stable machine-readable `code` (for API consumers / frontend
 *     i18n, not just an English message)
 *   - carry structured `context` for audit logs / debugging
 *   - still map cleanly onto an HTTP status via DomainExceptionFilter below
 *
 * Service code should throw these instead of NestJS's built-in exceptions
 * whenever the failure is a *business rule*, not a transport-layer concern.
 */

export interface DomainExceptionOptions {
  code: string;
  message: string;
  httpStatus?: number;
  context?: Record<string, unknown>;
}

export class DomainException extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly context?: Record<string, unknown>;

  constructor(options: DomainExceptionOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? 400;
    this.context = options.context;
  }
}

export class BusinessRuleViolationException extends DomainException {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super({ code, message, httpStatus: 422, context });
  }
}

export class ResourceNotFoundException extends DomainException {
  constructor(resource: string, identifier: string, context?: Record<string, unknown>) {
    super({
      code: `${resource.toUpperCase()}_NOT_FOUND`,
      message: `${resource} with identifier '${identifier}' was not found`,
      httpStatus: 404,
      context: { resource, identifier, ...context },
    });
  }
}

export class TenantIsolationException extends DomainException {
  constructor(message = 'Cross-tenant access denied', context?: Record<string, unknown>) {
    super({ code: 'TENANT_ISOLATION_VIOLATION', message, httpStatus: 403, context });
  }
}

export class ConcurrencyConflictException extends DomainException {
  constructor(resource: string, context?: Record<string, unknown>) {
    super({
      code: 'CONCURRENCY_CONFLICT',
      message: `${resource} was modified by another request. Reload and retry.`,
      httpStatus: 409,
      context: { resource, ...context },
    });
  }
}

export class FeatureNotAvailableException extends DomainException {
  constructor(featureKey: string, context?: Record<string, unknown>) {
    super({
      code: 'FEATURE_NOT_AVAILABLE',
      message: `Feature '${featureKey}' is not enabled for this tenant`,
      httpStatus: 403,
      context: { featureKey, ...context },
    });
  }
}

export class IntegrationProviderException extends DomainException {
  constructor(providerKey: string, message: string, context?: Record<string, unknown>) {
    super({
      code: 'INTEGRATION_PROVIDER_ERROR',
      message: `Integration provider '${providerKey}' failed: ${message}`,
      httpStatus: 502,
      context: { providerKey, ...context },
    });
  }
}
