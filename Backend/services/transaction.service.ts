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
}
