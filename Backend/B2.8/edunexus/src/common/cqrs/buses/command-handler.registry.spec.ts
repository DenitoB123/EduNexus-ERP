import { CommandHandlerRegistry } from './command-handler.registry';
import { BaseCommand } from '../commands/base.command';
import { ICommandHandler } from '../interfaces/command.interface';

class CommandA extends BaseCommand {}
class CommandB extends BaseCommand {}

describe('CommandHandlerRegistry', () => {
  it('resolves the handler registered for a command instance', () => {
    const registry = new CommandHandlerRegistry();
    const handlerA: ICommandHandler<CommandA, void> = { execute: jest.fn() };
    registry.register(CommandA, handlerA);

    expect(registry.resolve(new CommandA())).toBe(handlerA);
    expect(registry.resolve(new CommandB())).toBeUndefined();
  });

  it('throws when registering a second handler for the same command', () => {
    const registry = new CommandHandlerRegistry();
    registry.register(CommandA, { execute: jest.fn() });

    expect(() => registry.register(CommandA, { execute: jest.fn() })).toThrow(
      /Duplicate CommandHandler: "CommandA"/,
    );
  });

  it('lists registered command names', () => {
    const registry = new CommandHandlerRegistry();
    registry.register(CommandA, { execute: jest.fn() });
    registry.register(CommandB, { execute: jest.fn() });

    expect(registry.listRegisteredCommandNames().sort()).toEqual(['CommandA', 'CommandB']);
  });
});
