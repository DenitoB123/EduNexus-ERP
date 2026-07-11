import { CommandBus } from './command-bus.service';
import { CommandHandlerRegistry } from './command-handler.registry';
import { BaseCommand } from '../commands/base.command';
import { ICommandHandler } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';

class TestCommand extends BaseCommand {
  constructor(public readonly value: string) {
    super();
  }
}

const context: ICqrsExecutionContext = { correlationId: 'corr-1', tenantId: 'tenant-1' };

describe('CommandBus', () => {
  let registry: CommandHandlerRegistry;
  let bus: CommandBus;

  beforeEach(() => {
    registry = new CommandHandlerRegistry();
    bus = new CommandBus(registry, []);
  });

  it('dispatches to the registered handler for the command class', async () => {
    const handler: ICommandHandler<TestCommand, string> = {
      execute: jest.fn().mockResolvedValue('handled'),
    };
    bus.register(TestCommand, handler);

    const result = await bus.execute(new TestCommand('x'), context);

    expect(result).toBe('handled');
    expect(handler.execute).toHaveBeenCalledWith(expect.any(TestCommand), context);
  });

  it('throws when no handler is registered for the command', async () => {
    await expect(bus.execute(new TestCommand('x'), context)).rejects.toThrow(
      /No CommandHandler registered for "TestCommand"/,
    );
  });

  it('runs pipeline behaviors around the handler in order', async () => {
    const order: string[] = [];
    const handler: ICommandHandler<TestCommand, void> = {
      execute: async () => {
        order.push('handler');
      },
    };
    bus = new CommandBus(registry, [
      {
        name: 'first',
        handle: async (_cmd, _ctx, next) => {
          order.push('first-before');
          const result = await next();
          order.push('first-after');
          return result;
        },
      },
      {
        name: 'second',
        handle: async (_cmd, _ctx, next) => {
          order.push('second-before');
          const result = await next();
          order.push('second-after');
          return result;
        },
      },
    ]);
    bus.register(TestCommand, handler);

    await bus.execute(new TestCommand('x'), context);

    expect(order).toEqual(['first-before', 'second-before', 'handler', 'second-after', 'first-after']);
  });
});
