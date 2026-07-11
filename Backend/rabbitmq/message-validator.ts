import { QueueMessage } from '../interfaces/queue.interface';

export class MessageValidator {
  static isValidEnvelope(message: unknown): message is QueueMessage {
    if (typeof message !== 'object' || message === null) return false;
    const m = message as Record<string, unknown>;
    return (
      typeof m.id === 'string' &&
      'payload' in m &&
      typeof m.attempt === 'number' &&
      typeof m.publishedAt === 'string'
    );
  }
}
