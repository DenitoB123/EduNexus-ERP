import { registerAs } from '@nestjs/config';

export interface SchedulerInfraConfig {
  enabled: boolean;
}

export default registerAs('scheduler', (): SchedulerInfraConfig => ({
  enabled: process.env.SCHEDULER_ENABLED !== 'false',
}));
