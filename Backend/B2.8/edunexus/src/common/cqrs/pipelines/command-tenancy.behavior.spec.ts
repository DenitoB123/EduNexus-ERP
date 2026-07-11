import { CommandTenancyBehavior } from './command-tenancy.behavior';
import { TenantCommand } from '../commands/tenant.command';
import { BaseCommand } from '../commands/base.command';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';

class ScopedCommand extends TenantCommand {
  constructor(tenantId: string) {
    super(tenantId);
  }
}

class UnscopedCommand extends BaseCommand {}

describe('CommandTenancyBehavior', () => {
  const behavior = new CommandTenancyBehavior();
  const next = jest.fn().mockResolvedValue('ok');

  beforeEach(() => next.mockClear());

  it('passes through commands that are not tenant-scoped', async () => {
    const context: ICqrsExecutionContext = { correlationId: 'c1' };
    await expect(behavior.handle(new UnscopedCommand(), context, next)).resolves.toBe('ok');
    expect(next).toHaveBeenCalled();
  });

  it('allows a TenantCommand whose tenantId matches the execution context', async () => {
    const context: ICqrsExecutionContext = { correlationId: 'c1', tenantId: 'tenant-1' };
    await expect(behavior.handle(new ScopedCommand('tenant-1'), context, next)).resolves.toBe('ok');
  });

  it('rejects a TenantCommand whose tenantId does not match the execution context', async () => {
    const context: ICqrsExecutionContext = { correlationId: 'c1', tenantId: 'tenant-2' };
    await expect(behavior.handle(new ScopedCommand('tenant-1'), context, next)).rejects.toThrow(
      /does not match execution context/,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a TenantCommand with no tenantId at all', async () => {
    const context: ICqrsExecutionContext = { correlationId: 'c1' };
    await expect(behavior.handle(new ScopedCommand(''), context, next)).rejects.toThrow(
      /without a tenantId/,
    );
  });
});
