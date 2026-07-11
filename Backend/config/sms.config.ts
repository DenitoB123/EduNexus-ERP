import { registerAs } from '@nestjs/config';

export interface SmsConfig {
  provider: 'log';
  defaultSenderId: string;
}

export default registerAs('sms', (): SmsConfig => ({
  provider: 'log',
  defaultSenderId: process.env.SMS_DEFAULT_SENDER_ID ?? 'EduNexus',
}));
