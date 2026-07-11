export interface ParticipantContactInfo {
  email?: string;
  phone?: string;
}

/**
 * Resolves an opaque `participantId` to an email address / phone
 * number for the Email/SMS channels. No implementation is registered
 * by B2.19: this codebase has no canonical User/contact model yet
 * (that's the parallel D-track, not merged into B1.1-B2.2). Until one
 * is registered, `CommunicationNotificationBridge` skips email/SMS
 * dispatch (logs at debug level) rather than guessing at contact
 * info — push notifications (keyed by participantId directly via
 * `PushService.sendToSubject`) are unaffected.
 */
export interface IContactResolver {
  resolve(participantId: string, tenantId: string): Promise<ParticipantContactInfo | null>;
}

export const COMMUNICATION_CONTACT_RESOLVER = 'COMMUNICATION_CONTACT_RESOLVER';
