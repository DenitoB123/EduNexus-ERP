import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { MpesaPaymentProvider } from './providers/payment/mpesa.provider';
import { AfricasTalkingSmsProvider } from './providers/sms/africastalking.provider';
import { SecurityModule } from '../security/security.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationsModule — Milestone 1.7
//
// Provider registry for external systems (payment gateways, SMS, email,
// LMS, government). M-Pesa + Africa's Talking are registered as the first
// concrete providers (Kenya reference market); both throw a clearly-labeled
// "not yet wired" error on the actual external call rather than silently
// no-op'ing, so Phase 2 work knows exactly what's left.
// ─────────────────────────────────────────────────────────────────────────────
@Module({
  imports: [SecurityModule, AuditLogModule],
  providers: [IntegrationsService, MpesaPaymentProvider, AfricasTalkingSmsProvider],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
