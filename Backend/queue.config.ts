import { registerAs } from '@nestjs/config';

export interface QueueInfraConfig {
  defaultMaxAttempts: number;
  workerPrefetch: number;
}

export default registerAs('queue', (): QueueInfraConfig => ({
  defaultMaxAttempts: parseInt(process.env.QUEUE_DEFAULT_MAX_ATTEMPTS ?? '5', 10),
  workerPrefetch: parseInt(process.env.QUEUE_WORKER_PREFETCH ?? '10', 10),
}));
