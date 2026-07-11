import { randomUUID } from 'crypto';
import { QueueMessage } from '../interfaces/queue.interface';

export class MessageSerializer {
  static wrap<T>(payload: T, correlationId?: string, attempt = 0): QueueMessage<T> {
    return {
      id: randomUUID(),
      payload,
      attempt,
      publishedAt: new Date().toISOString(),
      correlationId,
    };
  }

  static toBuffer<T>(message: QueueMessage<T>): Buffer {
    return Buffer.from(JSON.stringify(message));
  }

  static fromBuffer<T>(buffer: Buffer): QueueMessage<T> {
    return JSON.parse(buffer.toString()) as QueueMessage<T>;
  }
}
