import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ISmsProvider } from '../interfaces/notification.interface';
import { LogSmsProvider } from './log-sms.provider';

@Injectable()
export class SmsFactory {
  constructor(private readonly logger: AppLoggerService) {}

  create(): ISmsProvider {
    return new LogSmsProvider(this.logger);
  }
}
