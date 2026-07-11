import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../logger/app-logger.service';
import { Alert, IAlertChannel } from '../interfaces/alert.interface';

/**
 * Default (always-registered) channel: writes structured alert
 * records through the existing AppLoggerService/winston pipeline, so
 * alerts land wherever the rest of the app's logs already go
 * (console in dev, JSON file transport in prod — see
 * common/logger/app-logger.service.ts) with no new infrastructure.
 * Higher-signal channels (email/SMS/PagerDuty/Slack) register
 * alongside this one via the ALERT_CHANNELS token; see
 * IMPLEMENTATION_SUMMARY_B2_16.md §5 for wiring B2.10's
 * NotificationService in as an EMERGENCY-category channel once that
 * milestone is merged.
 */
@Injectable()
export class LogAlertChannel implements IAlertChannel {
  readonly name = 'log';

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('AlertService');
  }

  async send(alert: Alert): Promise<void> {
    const line = `[ALERT:${alert.severity.toUpperCase()}] ${alert.title} — ${alert.message}`;
    if (alert.severity === 'critical') {
      this.logger.error(line, undefined, 'AlertService');
    } else {
      this.logger.warn(line, 'AlertService');
    }
  }
}
