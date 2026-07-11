import { Injectable } from '@nestjs/common';
import { SmsProvider, SendSmsParams, SendSmsResult } from '../../interfaces/sms-provider.interface';
import { IntegrationProviderException } from '../../../../exceptions/domain.exception';
import { toKenyanMsisdn } from '../../../../common/validators/is-kenyan-phone-number.validator';

/**
 * Africa's Talking SMS provider — pan-African coverage (Kenya, Uganda,
 * Tanzania, Nigeria, ...), consistent with the platform's pan-African
 * target market. Same pattern as MpesaPaymentProvider: interface fully
 * implemented, the live HTTP call to africastalking.com is a documented
 * TODO pending an API-key decision per school/tenant.
 */
@Injectable()
export class AfricasTalkingSmsProvider implements SmsProvider {
  readonly key = 'africastalking';

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const msisdn = params.to.startsWith('+') || params.to.startsWith('254')
      ? params.to
      : toKenyanMsisdn(params.to);

    // TODO(Phase 2): POST to https://api.africastalking.com/version1/messaging
    // using per-school apiKey/username from IntegrationConfig.
    throw new IntegrationProviderException(
      this.key,
      'Africa\'s Talking API not yet wired — apiKey/username config pending',
      { to: msisdn },
    );
  }
}
