export class MessageRetryStrategy {
  static shouldRetry(attempt: number, maxRetries: number): boolean {
    return attempt < maxRetries;
  }

  static nextDelayMs(attempt: number, baseDelayMs = 1000): number {
    return Math.min(baseDelayMs * 2 ** attempt, 30000);
  }
}
