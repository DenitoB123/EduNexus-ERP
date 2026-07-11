import { Injectable } from '@nestjs/common';
import { ICommand } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { CommandNext, ICommandPipelineBehavior } from '../interfaces/pipeline.interface';
import { TransactionalCommand } from '../commands/transactional.command';
import { TransactionService, PrismaTransactionClient } from '../../../database/services/transaction.service';
import { CqrsTransactionContextService } from '../utils/cqrs-transaction-context.service';
import { CQRS_DEFAULT_COMMAND_RETRY_ATTEMPTS } from '../constants/cqrs.constants';

/**
 * Wraps handler execution in `TransactionService.run()`/`runWithRetry()`
 * (database/services/transaction.service.ts, B2.2) for any command
 * that extends `TransactionalCommand`. No second transaction mechanism
 * is introduced — this behavior only decides *whether* and *how* to
 * call the existing one.
 *
 * KNOWN GAP (documented, not silently papered over): B2.2's repository
 * classes bind their Prisma delegate once at construction
 * (`PrismaRepository`'s `protected readonly delegate`), so there is
 * currently no way for a handler's constructor-injected repository to
 * pick up *this* behavior's `tx` client automatically — the two are
 * not wired together anywhere in B1-B2.2. This behavior still opens a
 * real transaction and guarantees retry-on-transient-failure around
 * the handler as a whole, but a handler that needs its repository
 * writes to share that exact transaction must currently construct a
 * transaction-scoped repository instance itself, e.g.
 * `new StudentRepository(tx.student)`, using the `tx` this behavior
 * passes as the sole argument to `work()`. Closing this gap with a
 * request/command-scoped repository provider is left to a future
 * milestone (see `IMPLEMENTATION_SUMMARY_B2_8.md`) rather than
 * reworked here, since it would mean modifying B2.2's repository
 * construction contract, not just adding CQRS infrastructure.
 */
@Injectable()
export class CommandTransactionBehavior implements ICommandPipelineBehavior {
  readonly name = 'CommandTransactionBehavior';

  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactionContext: CqrsTransactionContextService,
  ) {}

  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    context: ICqrsExecutionContext,
    next: CommandNext<TResult>,
  ): Promise<TResult> {
    if (!(command instanceof TransactionalCommand)) {
      return next();
    }

    const work = (tx: PrismaTransactionClient): Promise<TResult> =>
      this.transactionContext.run(tx, next);

    if (command.useRetry) {
      return this.transactionService.runWithRetry(work, {
        maxAttempts: command.maxRetryAttempts ?? CQRS_DEFAULT_COMMAND_RETRY_ATTEMPTS,
      });
    }

    return this.transactionService.run(work);
  }
}
