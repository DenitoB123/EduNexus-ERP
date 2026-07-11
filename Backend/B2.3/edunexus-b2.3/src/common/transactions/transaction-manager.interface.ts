/**
 * transaction-manager.interface.ts
 *
 * B2.3 — Generic Service Layer — Transaction Support
 *
 * Contract for the transaction infrastructure this milestone integrates
 * with. The concrete implementation (Prisma $transaction wrapper, nested
 * transaction/savepoint emulation, retry logic) belongs to B2.2 and is
 * injected via the TRANSACTION_MANAGER token. BaseService only depends on
 * this interface.
 */

export interface ITransactionOptions {
  /** Max retry attempts on transient/deadlock errors. Default handled by the concrete implementation. */
  maxRetries?: number;
  /** Transaction timeout in ms. */
  timeoutMs?: number;
  /** Isolation level, if supported by the underlying implementation. */
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

/**
 * Opaque transaction context/client handed to work performed inside a
 * transaction (e.g. a Prisma transaction client). The Generic Service Layer
 * treats this as opaque and passes it through to repositories, which know
 * how to use it (per B2.2's repository contract).
 */
export type TransactionContext = unknown;

export interface ITransactionManager {
  /**
   * Runs `work` inside a transaction. If already inside a transaction
   * (nested call), implementations are expected to either join the existing
   * transaction or emulate a savepoint, per B2.2's nested-transaction
   * support — this milestone does not reimplement that behavior.
   */
  runInTransaction<T>(
    work: (tx: TransactionContext) => Promise<T>,
    options?: ITransactionOptions,
  ): Promise<T>;

  /** True if the current async context is already inside a transaction. */
  isInTransaction(): boolean;
}
