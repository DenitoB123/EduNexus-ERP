import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { randomBytes, createHmac } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { OnEvent } from '../event-bus/event-bus.service';
import {
  WEBHOOKS_QUEUE_NAME,
  WEBHOOK_JOB_NAMES,
  MAX_WEBHOOK_DELIVERY_ATTEMPTS,
} from './webhooks.constants';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
} from './dto/create-webhook-subscription.dto';

/**
 * WebhooksService — outbound side.
 * ─────────────────────────────────────────────────────────────────────────────
 * Listens for domain events already flowing through EventBusService (1.3)
 * and fans them out to every active subscription whose `events` list
 * matches, by enqueuing a delivery job per subscription rather than making
 * the HTTP call inline — keeps event publishers fast and gives delivery
 * retries (WebhookDeliveryProcessor) for free via Bull's backoff.
 *
 * This does NOT duplicate EventBusService: EventBusService is in-process +
 * durable log for internal subscribers; WebhooksService is the bridge from
 * that internal bus to external third-party HTTP endpoints.
 */
@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @InjectQueue(WEBHOOKS_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async createSubscription(schoolId: string | undefined, dto: CreateWebhookSubscriptionDto, actorId?: string) {
    const secret = randomBytes(32).toString('hex');
    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        schoolId,
        url: dto.url,
        events: dto.events,
        description: dto.description,
        secret,
      },
    });

    await this.auditLog.record({
      action: 'CREATE',
      entity: 'WebhookSubscription',
      entityId: subscription.id,
      userId: actorId,
      schoolId,
      metadata: { url: dto.url, events: dto.events },
    });

    // Secret is returned once, on creation, the same way an API key would be —
    // it is never exposed again via GET.
    return subscription;
  }

  async list(schoolId?: string) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return subs.map(({ secret, ...rest }) => rest);
  }

  async update(id: string, dto: UpdateWebhookSubscriptionDto, actorId?: string) {
    await this.assertExists(id);
    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: dto,
    });
    await this.auditLog.record({
      action: 'UPDATE',
      entity: 'WebhookSubscription',
      entityId: id,
      userId: actorId,
      metadata: dto,
    });
    const { secret, ...rest } = updated;
    return rest;
  }

  async remove(id: string, actorId?: string) {
    await this.assertExists(id);
    await this.prisma.webhookSubscription.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.auditLog.record({
      action: 'DELETE',
      entity: 'WebhookSubscription',
      entityId: id,
      userId: actorId,
    });
  }

  async listDeliveries(subscriptionId: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Catches every domain event published via EventBusService and fans it
   * out to matching subscriptions. Wildcard listener — EventEmitter2 is
   * configured with `wildcard: false` (event-bus.module.ts), so this relies
   * on EventBusService re-emitting under each concrete event name, which it
   * already does; we instead subscribe to the small set of event names that
   * matter for webhooks below as they're introduced, to avoid needing
   * wildcard support that the existing EventBusModule deliberately disabled.
   */
  @OnEvent('student.registered')
  async onStudentRegistered(payload: Record<string, unknown>) {
    return this.fanOut('student.registered', payload);
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(payload: Record<string, unknown>) {
    return this.fanOut('payment.completed', payload);
  }

  @OnEvent('user.created')
  async onUserCreated(payload: Record<string, unknown>) {
    return this.fanOut('user.created', payload);
  }

  private async fanOut(eventName: string, payload: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { isActive: true, deletedAt: null, events: { has: eventName } },
    });

    for (const subscription of subscriptions) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          subscriptionId: subscription.id,
          eventName,
          payload,
          status: 'PENDING',
        },
      });

      await this.queue.add(
        WEBHOOK_JOB_NAMES.DELIVER,
        { deliveryId: delivery.id },
        { attempts: MAX_WEBHOOK_DELIVERY_ATTEMPTS, backoff: { type: 'exponential', delay: 5000 } },
      );
    }
  }

  signPayload(secret: string, rawBody: string): string {
    return createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.webhookSubscription.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Webhook subscription '${id}' not found`);
  }
}
