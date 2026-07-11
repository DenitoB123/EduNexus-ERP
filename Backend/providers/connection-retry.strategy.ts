export interface RetryOptions {
  attempts: number;
  delayMs: number;
}

export class ConnectionRetryStrategy {
  static async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    onAttemptFailed?: (attempt: number, error: unknown) => void,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        onAttemptFailed?.(attempt, error);

        if (attempt < options.attempts) {
          await this.sleep(options.delayMs * attempt);
        }
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
