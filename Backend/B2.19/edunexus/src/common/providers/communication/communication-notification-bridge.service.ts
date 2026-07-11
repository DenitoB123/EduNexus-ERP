import { Inject, Injectable, Optional } from '@nestjs/common';
import { PushService } from '../../../infrastructure/push/push.service';
import { EmailService } from '../../../infrastructure/email/email.service';
import { SmsService } from '../../../infrastructure/sms/sms.service';
import { AppLoggerService } from '../../logger/app-logger.service';
import { INotificationDispatcher, NotificationPayload } from './notification-dispatcher.interface';
import { COMMUNICATION_CONTACT_RESOLVER, IContactResolver } from './contact-resolver.interface';

/**
 * Default `INotificationDispatcher`. Push is a real, working
 * integration today (`PushService.sendToSubject` is keyed by an
 * opaque subject id, exactly like this module's `participantId`, so
 * no contact-info lookup is needed). Email/SMS additionally require
 * an `IContactResolver` — see that file for why none is registered
 * yet — and are skipped (not failed) when one isn't present, so a
 * conversation with no email resolver configured still works for
 * push+in-app, it just doesn't also email people.
 */
@Injectable()
export class CommunicationNotificationBridge implements INotificationDispatcher {
  constructor(
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly logger: AppLoggerService,
    @Optional()
    @Inject(COMMUNICATION_CONTACT_RESOLVER)
    private readonly contactResolver?: IContactResolver,
  ) {
    this.logger.setContext('CommunicationNotificationBridge');
  }

  async notifyParticipant(participantId: string, tenantId: string, payload: NotificationPayload): Promise<void> {
    const channels = payload.channels ?? ['push'];

    const tasks: Promise<void>[] = [];

    if (channels.includes('push')) {
      tasks.push(this.pushService.sendToSubject(participantId, payload.title, payload.body, payload.data));
    }

    if (channels.includes('email') || channels.includes('sms')) {
      tasks.push(this.dispatchViaContactResolver(participantId, tenantId, payload, channels));
    }

    const results = await Promise.allSettled(tasks);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Notification dispatch failed for participant "${participantId}": ${result.reason}`);
      }
    }
  }

  private async dispatchViaContactResolver(
    participantId: string,
    tenantId: string,
    payload: NotificationPayload,
    channels: NotificationPayload['channels'],
  ): Promise<void> {
    if (!this.contactResolver) {
      this.logger.debug(
        `Skipping email/SMS for participant "${participantId}" — no IContactResolver registered (COMMUNICATION_CONTACT_RESOLVER).`,
      );
      return;
    }

    const contact = await this.contactResolver.resolve(participantId, tenantId);
    if (!contact) return;

    if (channels?.includes('email') && contact.email) {
      await this.emailService.send({ to: contact.email, subject: payload.title, html: payload.body });
    }

    if (channels?.includes('sms') && contact.phone) {
      await this.smsService.send({ to: contact.phone, message: `${payload.title}: ${payload.body}` });
    }
  }
}
