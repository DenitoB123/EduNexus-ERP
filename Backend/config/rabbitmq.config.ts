import { registerAs } from '@nestjs/config';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  queuePrefix: string;
  reconnectTimeMs: number;
  heartbeatSec: number;
}

export default registerAs('rabbitmq', (): RabbitMQConfig => ({
  url: process.env.RABBITMQ_URL as string,
  exchange: process.env.RABBITMQ_EXCHANGE ?? 'edunexus.exchange',
  queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX ?? 'edunexus',
  reconnectTimeMs: parseInt(process.env.RABBITMQ_RECONNECT_TIME_MS ?? '5000', 10),
  heartbeatSec: parseInt(process.env.RABBITMQ_HEARTBEAT_SEC ?? '30', 10),
}));
