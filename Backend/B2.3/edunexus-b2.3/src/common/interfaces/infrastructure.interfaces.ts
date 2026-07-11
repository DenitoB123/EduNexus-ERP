/**
 * infrastructure.interfaces.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Extension-point contracts for shared logging, exception handling, and
 * permission checking. Concrete implementations belong to earlier
 * milestones' shared infrastructure and are injected via the tokens in
 * tokens.ts. Nothing in this file duplicates those implementations.
 */

export interface IAppLogger {
  log(message: string, context?: string, meta?: Record<string, unknown>): void;
  debug(message: string, context?: string, meta?: Record<string, unknown>): void;
  warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void;
  /** Records a timing/performance metric, e.g. service method duration. */
  metric(name: string, valueMs: number, meta?: Record<string, unknown>): void;
}

/**
 * Standardized enterprise exception shape, matching the shared exception
 * framework from earlier milestones. Generic services throw exceptions
 * produced by IExceptionFactory rather than raw Error/HttpException so that
 * every business module surfaces consistent error codes/shapes.
 */
export interface IEnterpriseException extends Error {
  code: string;
  httpStatus: number;
  details?: Record<string, unknown>;
}

export interface IExceptionFactory {
  notFound(entity: string, id: unknown): IEnterpriseException;
  conflict(message: string, details?: Record<string, unknown>): IEnterpriseException;
  validationFailed(errors: Record<string, string[]> | string[], message?: string): IEnterpriseException;
  forbidden(message?: string, details?: Record<string, unknown>): IEnterpriseException;
  tenantMismatch(message?: string): IEnterpriseException;
  businessRuleViolation(ruleName: string, message: string, details?: Record<string, unknown>): IEnterpriseException;
  internal(message: string, details?: Record<string, unknown>): IEnterpriseException;
}

export interface IPermissionChecker {
  hasPermission(userId: string, permission: string, roles: string[]): boolean | Promise<boolean>;
  hasAnyPermission(userId: string, permissions: string[], roles: string[]): boolean | Promise<boolean>;
}
