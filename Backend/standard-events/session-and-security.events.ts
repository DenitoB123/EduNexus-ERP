import { ApplicationEvent, AuditEvent, EventBaseOptions } from '../event.base';

/**
 * B2.7 — Standard application/audit events. UserLoggedIn/LoggedOut are
 * application-level (session lifecycle); PermissionChanged and
 * RoleAssigned are audit events since they are security-sensitive and
 * must land in the audit trail automatically (see AuditEventHandler).
 */

export class UserLoggedInEvent extends ApplicationEvent {
  constructor(
    public readonly userId: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    options?: EventBaseOptions,
  ) {
    super('auth.user.logged-in', {
      ...options,
      actorId: userId,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}

export class UserLoggedOutEvent extends ApplicationEvent {
  constructor(
    public readonly userId: string,
    public readonly reason: 'manual' | 'expired' | 'revoked' = 'manual',
    options?: EventBaseOptions,
  ) {
    super('auth.user.logged-out', {
      ...options,
      actorId: userId,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}

export class PermissionChangedEvent extends AuditEvent {
  constructor(
    subjectId: string,
    subjectType: 'User' | 'Role' | 'Position',
    public readonly permissionKey: string,
    public readonly granted: boolean,
    options?: EventBaseOptions,
  ) {
    super(
      'security.permission.changed',
      {
        action: 'PERMISSION_CHANGE',
        entityType: subjectType,
        entityId: subjectId,
        after: { permissionKey, granted },
      },
      { ...options, aggregateId: subjectId, aggregateType: subjectType },
    );
  }
}

export class RoleAssignedEvent extends AuditEvent {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly assigned: boolean,
    options?: EventBaseOptions,
  ) {
    super(
      'security.role.assigned',
      {
        action: 'ROLE_ASSIGNMENT',
        entityType: 'User',
        entityId: userId,
        after: { roleId, assigned },
      },
      { ...options, aggregateId: userId, aggregateType: 'User' },
    );
  }
}
