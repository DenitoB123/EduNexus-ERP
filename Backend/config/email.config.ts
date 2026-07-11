import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  provider: 'smtp';
  from: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
  };
}

export default registerAs('email', (): EmailConfig => ({
  provider: 'smtp',
  from: process.env.EMAIL_FROM ?? 'no-reply@edunexus.local',
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
}));
