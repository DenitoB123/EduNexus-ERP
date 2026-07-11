/**
 * validation-pipeline.ts
 *
 * B2.3 — Generic Service Layer — Business Validation Layer
 *
 * Aggregates and executes IValidator instances for a given lifecycle stage.
 * BaseService uses one pipeline instance per concrete service (constructed
 * with whatever validators the subclass registers) to run pre-create,
 * pre-update, pre-delete, cross-entity, tenant, permission, and duplicate
 * validation consistently.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { IValidator, IValidationResult, ValidationStage } from './validation.interface';
import { IRequestContext } from '../interfaces/context.interfaces';
import { IValidationError } from '../responses/service-response';
import { APP_LOGGER } from '../interfaces/tokens';
import { IAppLogger } from '../interfaces/infrastructure.interfaces';

@Injectable()
export class ValidationPipeline {
  private readonly validators: IValidator[] = [];

  constructor(@Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger) {}

  register(validator: IValidator): this {
    this.validators.push(validator);
    return this;
  }

  registerMany(validators: IValidator[]): this {
    validators.forEach((v) => this.register(v));
    return this;
  }

  async run<TPayload = unknown>(
    stage: ValidationStage,
    payload: TPayload,
    context: IRequestContext,
  ): Promise<IValidationResult> {
    const applicable = this.validators.filter((v) => v.stage === stage);
    const errors: IValidationError[] = [];

    for (const validator of applicable) {
      const result = await validator.validate(payload, context);
      if (!result.valid) {
        errors.push(...result.errors);
        this.logger?.warn(`Validation failed: ${validator.name}`, 'ValidationPipeline', {
          stage,
          errors: result.errors,
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async runMany<TPayload = unknown>(
    stages: ValidationStage[],
    payload: TPayload,
    context: IRequestContext,
  ): Promise<IValidationResult> {
    const errors: IValidationError[] = [];
    for (const stage of stages) {
      const result = await this.run(stage, payload, context);
      errors.push(...result.errors);
    }
    return { valid: errors.length === 0, errors };
  }
}
