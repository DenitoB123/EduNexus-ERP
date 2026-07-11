import { CommandTransactionBehavior } from './command-transaction.behavior';
import { CqrsTransactionContextService } from '../utils/cqrs-transaction-context.service';
import { TransactionService } from '../../../database/services/transaction.service';
import { TransactionalCommand } from '../commands/transactional.command';
import { AuthenticatedCommand } from '../commands/authenticated.command';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';

class PlaceOrderCommand extends TransactionalCommand {
  constructor(tenantId: string, actorId: string) {
    super(tenantId, actorId);
  }
}

class ReadOnlyCommand extends AuthenticatedCommand {
  constructor() {
    super('tenant-1', 'actor-1');
  }
}

const context: ICqrsExecutionContext = { correlationId: 'c1', tenantId: 'tenant-1' };

describe('CommandTransactionBehavior', () => {
  let transactionService: jest.Mocked<Pick<TransactionService, 'run' | 'runWithRetry'>>;
  let behavior: CommandTransactionBehavior;

  beforeEach(() => {
    transactionService = {
      run: jest.fn((work) => work({} as never)),
      runWithRetry: jest.fn((work) => work({} as never)),
    };
    behavior = new CommandTransactionBehavior(
      transactionService as unknown as TransactionService,
      new CqrsTransactionContextService(),
    );
  });

  it('calls next() directly for non-transactional commands, bypassing TransactionService', async () => {
    const next = jest.fn().mockResolvedValue('ok');
    await expect(behavior.handle(new ReadOnlyCommand(), context, next)).resolves.toBe('ok');
    expect(transactionService.run).not.toHaveBeenCalled();
    expect(transactionService.runWithRetry).not.toHaveBeenCalled();
  });

  it('wraps a TransactionalCommand in runWithRetry by default', async () => {
    const next = jest.fn().mockResolvedValue('ok');
    await expect(
      behavior.handle(new PlaceOrderCommand('tenant-1', 'actor-1'), context, next),
    ).resolves.toBe('ok');
    expect(transactionService.runWithRetry).toHaveBeenCalled();
    expect(transactionService.run).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
