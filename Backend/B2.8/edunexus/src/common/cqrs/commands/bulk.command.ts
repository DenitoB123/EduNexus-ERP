import { TransactionalCommand } from './transactional.command';

/**
 * A transactional command whose payload is a batch of homogeneous
 * items (e.g. bulk-enroll students, bulk fee-structure updates).
 * Deliberately thin: it only standardizes the `items` shape and a
 * `continueOnItemError` flag. Handlers decide whether to process the
 * batch item-by-item inside the single transaction
 * `CommandTransactionBehavior` opens, or call
 * `TransactionService.runBatch()` directly for pure Prisma batch
 * operations (B2.2) — both are valid depending on whether the items
 * need per-item business logic.
 */
export abstract class BulkCommand<TItem> extends TransactionalCommand {
  readonly items: TItem[];
  readonly continueOnItemError: boolean = false;

  protected constructor(
    tenantId: string,
    actorId: string,
    items: TItem[],
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, actorId, schoolGroupId, schoolId, campusId);
    this.items = items;
  }
}
