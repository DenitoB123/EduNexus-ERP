export interface QueueMessage<T = unknown> {
  id: string;
  payload: T;
  attempt: number;
  publishedAt: string;
  correlationId?: string;
}

export interface IPublisher {
  publish<T>(exchange: string, routingKey: string, payload: T, correlationId?: string): Promise<void>;
}

export interface IConsumerHandler<T = unknown> {
  handle(message: QueueMessage<T>): Promise<void>;
}

export interface QueueBindingConfig {
  queue: string;
  exchange: string;
  routingKey: string;
  durable?: boolean;
  deadLetterExchange?: string;
}
