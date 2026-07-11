import {
  NotificationChannel,
  NotificationEvent,
  SystemEvent,
  EventBaseOptions,
} from '../event.base';

/**
 * B2.7 — TenantCreated is a SystemEvent (platform provisioning, not
 * scoped to an already-existing tenant's own action). NotificationSent
 * is raised by the notification dispatch handler itself, after a
 * channel provider confirms delivery, so other modules (e.g. an
 * in-app notification-center read model) can react without depending
 * on Email/SMS/Push modules directly.
 */

export class TenantCreatedEvent extends SystemEvent {
  constructor(
    public readonly tenantId: string,
    public readonly tenantName: string,
    options?: EventBaseOptions,
  ) {
    super('tenant.created', {
      ...options,
      tenantId,
      aggregateId: tenantId,
      aggregateType: 'Tenant',
    });
  }
}

/**
 * Raised by any module that wants a notification sent, without coupling
 * to Email/Sms/Push modules. NotificationDispatchHandler subscribes to
 * this exact event name and routes by `payload.channel`.
 */
export class NotificationRequestedEvent extends NotificationEvent {
  constructor(
    channel: NotificationChannel,
    recipient: string | string[],
    body: string,
    extra?: {
      title?: string;
      templateKey?: string;
      templateContext?: Record<string, unknown>;
      data?: Record<string, string>;
    },
    options?: EventBaseOptions,
  ) {
    super('notification.requested', { channel, recipient, body, ...extra }, options);
  }
}

export class NotificationSentEvent extends NotificationEvent {
  constructor(
    channel: NotificationChannel,
    recipient: string | string[],
    public readonly success: boolean,
    public readonly providerMessageId?: string,
    options?: EventBaseOptions,
  ) {
    super('notification.sent', { channel, recipient, body: '' }, options);
  }
}
