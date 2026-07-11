import { Injectable } from '@nestjs/common';
import { EventBus } from './event-bus.service';
import { AuditAction, AuditEvent, AuditEventPayload, EventBaseOptions } from './event.base';

class GenericAuditEvent extends AuditEvent {
  constructor(
    action: AuditAction,
    payload: Omit<AuditEventPayload, 'action'>,
    options?: EventBaseOptions,
  ) {
    super(`audit.${action.toLowerCase().replace(/_/g, '-')}`, { action, ...payload }, options);
  }
}

/**
 * B2.7 — Audit Integration.
 *
 * A thin facade so business modules (B3+) raise audit events with one
 * call instead of constructing AuditEvent subclasses by hand. Every
 * call goes through EventBus.emit, so the same PersistAllEventsSubscriber
 * that persists every other event also captures these — there is
 * deliberately no separate "audit log" write path.
 */
@Injectable()
export class AuditEventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  async recordCrud(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE',
    entityType: string,
    entityId: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    options?: EventBaseOptions,
  ): Promise<void> {
    await this.eventBus.emit(
      new GenericAuditEvent(
        action,
        { entityType, entityId, before: changes?.before, after: changes?.after },
        { ...options, aggregateId: entityId, aggregateType: entityType },
      ),
    );
  }

  async recordAuth(
    action: 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED',
    userId: string,
    reason?: string,
    options?: EventBaseOptions,
  ): Promise<void> {
    await this.eventBus.emit(
      new GenericAuditEvent(
        action,
        { entityType: 'User', entityId: userId, reason },
        { ...options, actorId: userId, aggregateId: userId, aggregateType: 'User' },
      ),
    );
  }

  async recordConfigChange(
    configKey: string,
    before: unknown,
    after: unknown,
    options?: EventBaseOptions,
  ): Promise<void> {
    await this.eventBus.emit(
      new GenericAuditEvent(
        'CONFIG_CHANGE',
        {
          entityType: 'Config',
          entityId: configKey,
          before: { value: before },
          after: { value: after },
        },
        { ...options, aggregateId: configKey, aggregateType: 'Config' },
      ),
    );
  }

  async recordPermissionChange(
    subjectId: string,
    subjectType: 'User' | 'Role' | 'Position',
    permissionKey: string,
    granted: boolean,
    options?: EventBaseOptions,
  ): Promise<void> {
    await this.eventBus.emit(
      new GenericAuditEvent(
        'PERMISSION_CHANGE',
        { entityType: subjectType, entityId: subjectId, after: { permissionKey, granted } },
        { ...options, aggregateId: subjectId, aggregateType: subjectType },
      ),
    );
  }
}
