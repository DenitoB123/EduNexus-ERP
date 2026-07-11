import { ISmsProvider, SendSmsInput } from '../interfaces/notification.interface';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/**
 * Default SMS provider that logs the message instead of dispatching
 * it through a real carrier/gateway. EduNexus has no SMS vendor
 * contracted yet; this keeps the SMS pipeline fully wired and
 * testable so a real gateway (Twilio, Vonage, etc.) can be dropped
 * in behind ISmsProvider without touching any calling code.
 */
export class LogSmsProvider implements ISmsProvider {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('LogSmsProvider');
  }

  async send(input: SendSmsInput): Promise<void> {
    this.logger.log(`[SMS] to=${input.to} message="${input.message}"`);
  }
}
