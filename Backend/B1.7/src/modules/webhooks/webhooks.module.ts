import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksInboundController } from './webhooks-inbound.controller';
import { WebhookDeliveryProcessor } from './processors/webhook-delivery.processor';
import { WEBHOOKS_QUEUE_NAME } from './webhooks.constants';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { IntegrationsModule } from '../integrations/integrations.module';

// ─────────────────────────────────────────────────────────────────────────────
// WebhooksModule — Milestone 1.7
//
// Registers its own queue ('webhooks') on the Bull/Redis connection already
// configured globally by JobsModule (Milestone 1.6) — does not re-run
// BullModule.forRootAsync, just adds one more named queue, so existing
// queues (notifications/emails/reports/ai-tasks/system) are untouched.
// ─────────────────────────────────────────────────────────────────────────────
@Module({
  imports: [
    BullModule.registerQueue({ name: WEBHOOKS_QUEUE_NAME }),
    AuditLogModule,
    IntegrationsModule,
  ],
  controllers: [WebhooksController, WebhooksInboundController],
  providers: [WebhooksService, WebhookDeliveryProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
