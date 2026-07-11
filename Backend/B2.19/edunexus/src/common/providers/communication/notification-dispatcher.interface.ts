export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  channels?: Array<'push' | 'email' | 'sms'>;
}

/**
 * How the messaging/announcement services fan a notification out to a
 * participant. The default implementation
 * (`CommunicationNotificationBridge`) uses the existing `PushService`
 * directly (push notifications don't need contact-info resolution —
 * see `IContactResolver`) and is a legitimate, working integration
 * today, not a stub. A future unified Notification Framework
 * milestone can register its own `INotificationDispatcher` under
 * `COMMUNICATION_NOTIFICATION_DISPATCHER` to replace it wholesale
 * without any caller of this interface changing.
 */
export interface INotificationDispatcher {
  notifyParticipant(participantId: string, tenantId: string, payload: NotificationPayload): Promise<void>;
}

export const COMMUNICATION_NOTIFICATION_DISPATCHER = 'COMMUNICATION_NOTIFICATION_DISPATCHER';
