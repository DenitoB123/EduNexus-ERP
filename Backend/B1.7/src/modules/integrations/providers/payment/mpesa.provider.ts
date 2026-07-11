import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentProvider, InitiatePaymentParams, InitiatePaymentResult } from '../../interfaces/payment-provider.interface';
import { IntegrationProviderException } from '../../../../exceptions/domain.exception';

/**
 * M-Pesa Daraja (STK Push) provider — Kenya's dominant payment rail, hence
 * first concrete implementation (memory: Kenya is the reference market).
 * Credentials (consumer key/secret, passkey, shortcode) are resolved per
 * school from IntegrationConfig by IntegrationsService, not hardcoded here.
 *
 * This is a real interface implementation wired for STK Push, but the
 * actual Daraja HTTP calls (OAuth token + STK push request) are left as a
 * documented TODO — credentials, sandbox vs production base URL, and
 * shortcode-per-school configuration need a decision from Dennis before
 * this makes a live call to Safaricom, rather than guessing at it here.
 */
@Injectable()
export class MpesaPaymentProvider implements PaymentProvider {
  readonly key = 'mpesa';

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    // TODO(Phase 2): exchange OAuth token, build STK push payload using
    // per-school shortcode/passkey from IntegrationConfig, POST to Daraja.
    throw new IntegrationProviderException(
      this.key,
      'STK Push not yet wired to Safaricom Daraja — credentials and shortcode-per-school config pending',
      { params },
    );
  }

  async verifySignature(rawBody: string, headers: Record<string, string>): Promise<boolean> {
    // Daraja callbacks aren't HMAC-signed the way most webhook providers
    // are; authenticity is normally established by allow-listing
    // Safaricom's callback IP range at the network/ingress layer instead.
    // Placeholder until that decision is made — defaults closed (false).
    void rawBody;
    void headers;
    return false;
  }

  /** Helper retained for when a shared-secret signing scheme is layered on top by IntegrationsService config. */
  protected sign(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
