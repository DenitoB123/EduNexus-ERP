/**
 * validation.interface.ts
 *
 * B2.3 — Generic Service Layer — Business Validation Layer
 */

import { IRequestContext } from '../interfaces/context.interfaces';
import { IValidationError } from '../responses/service-response';

export type ValidationStage = 'preCreate' | 'preUpdate' | 'preDelete' | 'crossEntity' | 'tenant' | 'permission' | 'duplicate';

export interface IValidationResult {
  valid: boolean;
  errors: IValidationError[];
}

export function validationOk(): IValidationResult {
  return { valid: true, errors: [] };
}

export function validationFail(errors: IValidationError[]): IValidationResult {
  return { valid: false, errors };
}

/**
 * A single validator, scoped to one stage of the entity lifecycle.
 * Business modules implement this for domain-specific checks; generic
 * validators (duplicate/tenant/permission) are provided in
 * common-validators.ts for reuse.
 */
export interface IValidator<TPayload = unknown> {
  readonly name: string;
  readonly stage: ValidationStage;
  validate(payload: TPayload, context: IRequestContext): Promise<IValidationResult> | IValidationResult;
}
