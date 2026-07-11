import { IsInt, Min } from 'class-validator';
import { CommandValidationBehavior } from './command-validation.behavior';
import { BaseCommand } from '../commands/base.command';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { IBusinessRuleValidator } from '../interfaces/extension-points.interface';

class AdjustStockCommand extends BaseCommand {
  @IsInt()
  @Min(0)
  quantity: number;

  constructor(quantity: number) {
    super();
    this.quantity = quantity;
  }
}

const context: ICqrsExecutionContext = { correlationId: 'c1' };

describe('CommandValidationBehavior', () => {
  it('passes structurally valid commands through to next()', async () => {
    const behavior = new CommandValidationBehavior([]);
    const next = jest.fn().mockResolvedValue('ok');

    await expect(behavior.handle(new AdjustStockCommand(5), context, next)).resolves.toBe('ok');
    expect(next).toHaveBeenCalled();
  });

  it('rejects structurally invalid commands before calling next()', async () => {
    const behavior = new CommandValidationBehavior([]);
    const next = jest.fn();

    await expect(behavior.handle(new AdjustStockCommand(-1), context, next)).rejects.toThrow(
      /failed structural validation/,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('runs registered business-rule validators that support the command', async () => {
    const validator: IBusinessRuleValidator<AdjustStockCommand> = {
      supports: (cmd): cmd is AdjustStockCommand => cmd instanceof AdjustStockCommand,
      validate: jest.fn().mockResolvedValue(undefined),
    };
    const behavior = new CommandValidationBehavior([validator]);
    const next = jest.fn().mockResolvedValue('ok');

    await behavior.handle(new AdjustStockCommand(5), context, next);

    expect(validator.validate).toHaveBeenCalledWith(expect.any(AdjustStockCommand), context);
  });
});
