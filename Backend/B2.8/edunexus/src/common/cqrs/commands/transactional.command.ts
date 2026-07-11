import { AuthenticatedCommand } from './authenticated.command';

/**
 * Marks a command as requiring a database transaction around its
 * handler. `CommandTransactionBehavior` checks
 * `instanceof TransactionalCommand` and, when true, wraps the
 * handler's `execute()` in `TransactionService.runWithRetry()`
 * (database/services/transaction.service.ts, B2.2) instead of calling
 * it directly — no new transaction mechanism is introduced.
 *
 * `useRetry` defaults to `true`; set it to `false` for commands whose
 * side effects (e.g. an outbound API call inside the handler) are not
 * safe to run more than once.
 */
export abstract class TransactionalCommand extends AuthenticatedCommand {
  readonly useRetry: boolean = true;
  readonly maxRetryAttempts?: number;

  protected constructor(
    tenantId: string,
    actorId: string,
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, actorId, schoolGroupId, schoolId, campusId);
  }
}
