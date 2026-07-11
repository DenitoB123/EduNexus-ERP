export interface QueueDefinition {
  name: string;
  routingKey: string;
  durable?: boolean;
  maxRetries?: number;
}

export const DEFAULT_QUEUE_OPTIONS: Required<Pick<QueueDefinition, 'durable' | 'maxRetries'>> = {
  durable: true,
  maxRetries: 5,
};
