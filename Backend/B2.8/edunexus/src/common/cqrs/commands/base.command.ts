import { randomUUID } from 'crypto';
import { ICommand } from '../interfaces/command.interface';

/**
 * Root of the command hierarchy. `commandName` defaults to the
 * concrete subclass's constructor name so handlers register by class
 * reference (see `CommandBus`) without needing a redundant string
 * literal kept in sync by hand.
 */
export abstract class BaseCommand implements ICommand {
  readonly commandId: string;
  readonly commandName: string;
  readonly issuedAt: Date;

  protected constructor() {
    this.commandId = randomUUID();
    this.commandName = new.target.name;
    this.issuedAt = new Date();
  }
}
