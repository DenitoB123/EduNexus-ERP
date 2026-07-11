import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { DATABASE_CONSTANTS } from '../constants/database.constants';
import { DatabaseErrorHandler } from '../exceptions/database.exceptions';

export type PrismaTransactionClient = Prisma.TransactionClient;

export interface TransactionOptions {
  timeoutMs?: number;
  maxWaitMs?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('TransactionService');
  }

  async run<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work, {
        timeout: options?.timeoutMs ?? DATABASE_CONSTANTS.TRANSACTION_DEFAULT_TIMEOUT_MS,
        maxWait: options?.maxWaitMs ?? DATABASE_CONSTANTS.TRANSACTION_MAX_WAIT_MS,
        isolationLevel: options?.isolationLevel,
      });
    } catch (error) {
      this.logger.error(
        `Transaction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw DatabaseErrorHandler.wrap(error, 'Transaction execution failed');
    }
  }

  async runBatch<T>(operations: Prisma.PrismaPromise<T>[]): Promise<T[]> {
    try {
      return await this.prisma.$transaction(operations);
    } catch (error) {
      this.logger.error(
        `Batch transaction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw DatabaseErrorHandler.wrap(error, 'Batch transaction execution failed');
    }
  }

  /**
   * Retries a transaction on transient/retriable Prisma errors (connection
   * drops, deadlocks — see DatabaseErrorHandler.isRetriable, using the
   * same error-code set as PrismaService's own connection retry). Not a
   * substitute for idempotency: `work` may run more than once and must
   * be safe to retry (true nested transactions/savepoints are not
   * supported by Prisma across separate $transaction calls — reuse the
   * `tx` client passed into `work` for anything that must share the
   * same transaction rather than opening a second one).
   */
  async runWithRetry<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    options?: TransactionOptions & { maxAttempts?: number; retryDelayMs?: number },
  ): Promise<T> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const retryDelayMs = options?.retryDelayMs ?? 200;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.run(work, options);
      } catch (error) {
        lastError = error;
        const cause = (error as { cause?: unknown })?.cause ?? error;

        if (!DatabaseErrorHandler.isRetriable(cause) || attempt === maxAttempts) {
          throw error;
        }

        this.logger.warn(
          `Transaction attempt ${attempt}/${maxAttempts} failed with a retriable error, retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }
    }

    throw lastError;
  }
}
