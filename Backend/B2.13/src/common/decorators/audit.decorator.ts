/**
 * audit.decorator.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Metadata-only decorators read by AuditInterceptor. None of these do any
 * work themselves — they exist so a controller can declare its audit
 * intent once instead of every handler manually calling
 * ActivityLoggerService.
 */

import { SetMetadata } from '@nestjs/common';
import { AuditActionType, AuditCategory, AuditSeverity } from '../interfaces/audit-event.interface';

export const AUDIT_METADATA_KEY = 'audit:metadata';
export const AUDIT_IGNORE_KEY = 'audit:ignore';
export const AUDIT_ENTITY_KEY = 'audit:entity';
export const AUDIT_TRACK_CHANGES_KEY = 'audit:track-changes';

export interface AuditOptions {
  action: AuditActionType;
  category?: AuditCategory;
  module?: string;
  severity?: AuditSeverity;
  /** Static entity type override for this handler; falls back to the controller-level @AuditEntity() if omitted. */
  entityType?: string;
}

/**
 * Declares that a handler's invocation should be captured as an audit
 * event with the given action/category/severity. Without this,
 * AuditInterceptor still captures API_CALL-level events for
 * non-GET requests (see audit.interceptor.ts's inference fallback) — use
 * @Audit() when you want a more specific action/category than that
 * default, or need CRITICAL severity.
 */
export const Audit = (options: AuditOptions): MethodDecorator => SetMetadata(AUDIT_METADATA_KEY, options);

/** Opts a handler out of automatic capture entirely — e.g. health checks, the audit-search endpoints themselves. */
export const AuditIgnore = (): MethodDecorator => SetMetadata(AUDIT_IGNORE_KEY, true);

/** Controller-level: declares the default entityType for every handler in this controller (e.g. 'Student', 'Invoice'). */
export const AuditEntity = (entityType: string): ClassDecorator => SetMetadata(AUDIT_ENTITY_KEY, entityType);

/**
 * Marks a handler (typically an update endpoint) as needing before/after
 * entity-state comparison. AuditInterceptor alone cannot diff previous vs
 * new values — it only sees the HTTP request/response — so this decorator
 * signals intent for documentation/consistency, but the actual diff must
 * be produced by the handler's repository call going through
 * AuditedRepository (common/repositories/audited.repository.ts), which
 * has real before/after entity data to compare. This decorator lets
 * AuditInterceptor at least tag the resulting AuditEvent's metadata so
 * it's clear the handler is diff-tracked, even though the diff itself
 * comes from the repository layer.
 */
export const TrackChanges = (): MethodDecorator => SetMetadata(AUDIT_TRACK_CHANGES_KEY, true);
