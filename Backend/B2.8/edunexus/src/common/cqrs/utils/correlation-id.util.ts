import { randomUUID } from 'crypto';

/** Thin, explicit wrapper so call sites read as intent ("get a correlation id") rather than a bare `randomUUID()`. */
export class CorrelationIdUtil {
  static generate(): string {
    return randomUUID();
  }
}
