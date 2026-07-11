import { BaseCommand } from './base.command';

class CreateWidgetCommand extends BaseCommand {
  constructor(public readonly name: string) {
    super();
  }
}

describe('BaseCommand', () => {
  it('derives commandName from the concrete subclass', () => {
    const command = new CreateWidgetCommand('widget-1');
    expect(command.commandName).toBe('CreateWidgetCommand');
  });

  it('assigns a unique commandId to each instance', () => {
    const a = new CreateWidgetCommand('a');
    const b = new CreateWidgetCommand('b');
    expect(a.commandId).not.toBe(b.commandId);
  });

  it('stamps issuedAt with a Date', () => {
    const command = new CreateWidgetCommand('a');
    expect(command.issuedAt).toBeInstanceOf(Date);
  });
});
