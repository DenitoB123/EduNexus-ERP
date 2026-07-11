import { Inject, Injectable, Optional } from '@nestjs/common';
import { validate } from 'class-validator';
import { ICommand } from '../interfaces/command.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { CommandNext, ICommandPipelineBehavior } from '../interfaces/pipeline.interface';
import { IBusinessRuleValidator } from '../interfaces/extension-points.interface';
import { CQRS_BUSINESS_RULE_VALIDATORS } from '../constants/cqrs.constants';
import { ValidationException } from '../../exceptions/validation.exception';

/**
 * Two layers, matching the spec's "Command Validation" +
 * "Business Validation" split:
 *
 * 1. Structural validation — runs `class-validator`'s `validate()`
 *    directly on the command instance (the same library already used
 *    by `createGlobalValidationPipe()`,
 *    `common/pipes/validation.pipe.ts`, B1.1). Commands that want this
 *    simply put `class-validator` decorators on their own properties;
 *    commands with no decorators pass trivially (empty error array).
 *
 * 2. Business validation — delegates to any `IBusinessRuleValidator`
 *    providers registered under `CQRS_BUSINESS_RULE_VALIDATORS`. None
 *    are registered by B2.8 itself (see
 *    `interfaces/extension-points.interface.ts`); this is the B2.3
 *    extension point.
 */
@Injectable()
export class CommandValidationBehavior implements ICommandPipelineBehavior {
  readonly name = 'CommandValidationBehavior';

  constructor(
    @Optional()
    @Inject(CQRS_BUSINESS_RULE_VALIDATORS)
    private readonly businessRuleValidators: IBusinessRuleValidator[] = [],
  ) {}

  async handle<TCommand extends ICommand, TResult>(
    command: TCommand,
    context: ICqrsExecutionContext,
    next: CommandNext<TResult>,
  ): Promise<TResult> {
    const structuralErrors = await validate(command as object, {
      whitelist: false,
      forbidUnknownValues: false,
    });

    if (structuralErrors.length > 0) {
      const details = structuralErrors.map((e) => ({
        property: e.property,
        constraints: e.constraints,
      }));
      throw new ValidationException(`${command.commandName} failed structural validation`, details);
    }

    for (const validator of this.businessRuleValidators) {
      if (validator.supports(command)) {
        await validator.validate(command, context);
      }
    }

    return next();
  }
}
