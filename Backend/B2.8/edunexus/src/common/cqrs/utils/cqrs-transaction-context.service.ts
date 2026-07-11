import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { PrismaTransactionClient } from '../../../database/services/transaction.service';

/**
 * Exposes the Prisma transaction client `CommandTransactionBehavior`
 * opens for a `TransactionalCommand` to whatever runs inside that
 * command's handler, using `AsyncLocalStorage` — the same mechanism
 * `TenantContextService` (database/context/tenant-context.service.ts,
 * B1.2) already uses to propagate tenant/actor context without
 * threading parameters through every layer.
 *
 * This does not, by itself, make existing B2.2 repositories
 * transaction-aware (see the KNOWN GAP note in
 * `command-transaction.behavior.ts`) — it is the hook a future
 * transaction-aware repository base class can call
 * (`cqrsTransactionContext.getTx() ?? this.prisma`) to opt in, once
 * one exists.
 */
@Injectable()
export class CqrsTransactionContextService {
  private readonly storage = new AsyncLocalStorage<PrismaTransactionClient>();

  run<T>(tx: PrismaTransactionClient, callback: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, callback);
  }

  getTx(): PrismaTransactionClient | undefined {
    return this.storage.getStore();
  }
}
