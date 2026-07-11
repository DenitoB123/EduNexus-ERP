import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PaymentProvider } from './interfaces/payment-provider.interface';
import { SmsProvider } from './interfaces/sms-provider.interface';
import { EmailProvider } from './interfaces/email-provider.interface';
import { MpesaPaymentProvider } from './providers/payment/mpesa.provider';
import { AfricasTalkingSmsProvider } from './providers/sms/africastalking.provider';
import { UpsertIntegrationConfigDto } from './dto/upsert-integration-config.dto';
import { IntegrationProviderException } from '../../exceptions/domain.exception';

/**
 * IntegrationsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Central registry + config store for every external integration
 * (payment gateways, SMS, email, LMS, government systems — per brief).
 * Modules that need to send an SMS or initiate a payment should depend on
 * this service and ask for a provider by key, not import a gateway SDK
 * directly — that's what makes swapping M-Pesa for Flutterwave, or adding a
 * second SMS gateway, a config change instead of a code change across the
 * app.
 *
 * Credentials are encrypted at rest via the existing EncryptionService
 * (Milestone 1.3, security module) — this does not implement its own
 * crypto.
 */
@Injectable()
export class IntegrationsService {
  private readonly paymentProviders = new Map<string, PaymentProvider>();
  private readonly smsProviders = new Map<string, SmsProvider>();
  private readonly emailProviders = new Map<string, EmailProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly auditLog: AuditLogService,
    mpesa: MpesaPaymentProvider,
    africasTalking: AfricasTalkingSmsProvider,
  ) {
    this.paymentProviders.set(mpesa.key, mpesa);
    this.smsProviders.set(africasTalking.key, africasTalking);
  }

  getPaymentProvider(key: string): PaymentProvider {
    const provider = this.paymentProviders.get(key);
    if (!provider) throw new IntegrationProviderException(key, 'No payment provider registered for this key');
    return provider;
  }

  getSmsProvider(key: string): SmsProvider {
    const provider = this.smsProviders.get(key);
    if (!provider) throw new IntegrationProviderException(key, 'No SMS provider registered for this key');
    return provider;
  }

  getEmailProvider(key: string): EmailProvider {
    const provider = this.emailProviders.get(key);
    if (!provider) throw new IntegrationProviderException(key, 'No email provider registered for this key');
    return provider;
  }

  async upsertConfig(schoolId: string | undefined, dto: UpsertIntegrationConfigDto, actorId?: string) {
    const encryptedCredentials = dto.credentials
      ? this.encryption.encryptJson(dto.credentials)
      : undefined;

    const config = await this.prisma.integrationConfig.upsert({
      where: {
        schoolId_providerType_providerKey: {
          schoolId: schoolId ?? null,
          providerType: dto.providerType,
          providerKey: dto.providerKey,
        },
      },
      create: {
        schoolId,
        providerType: dto.providerType,
        providerKey: dto.providerKey,
        config: dto.config,
        encryptedCredentials,
        status: 'ACTIVE',
      },
      update: {
        config: dto.config,
        ...(encryptedCredentials && { encryptedCredentials }),
        status: 'ACTIVE',
      },
    });

    await this.auditLog.record({
      action: 'UPDATE',
      entity: 'IntegrationConfig',
      entityId: config.id,
      userId: actorId,
      schoolId,
      metadata: { providerType: dto.providerType, providerKey: dto.providerKey },
      // Never write `credentials` into the audit payload — that would defeat
      // the point of encrypting them at rest.
    });

    const { encryptedCredentials: _omit, ...safe } = config;
    return safe;
  }

  async list(schoolId?: string) {
    const configs = await this.prisma.integrationConfig.findMany({ where: { schoolId } });
    return configs.map(({ encryptedCredentials, ...rest }) => rest);
  }

  async getDecryptedCredentials<T = Record<string, unknown>>(
    schoolId: string | undefined,
    providerKey: string,
  ): Promise<T | null> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { schoolId, providerKey },
    });
    if (!config?.encryptedCredentials) return null;
    return this.encryption.decryptJson<T>(config.encryptedCredentials);
  }

  /** Dispatches inbound webhook signature verification to the matching provider, if one implements it. */
  async verifyInboundSignature(
    providerKey: string,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    const provider = this.paymentProviders.get(providerKey);
    if (provider) return provider.verifySignature(rawBody, headers);
    return false;
  }

  private async assertConfigExists(schoolId: string | undefined, providerKey: string): Promise<void> {
    const exists = await this.prisma.integrationConfig.findFirst({ where: { schoolId, providerKey } });
    if (!exists) throw new NotFoundException(`No integration config for provider '${providerKey}'`);
  }
}
