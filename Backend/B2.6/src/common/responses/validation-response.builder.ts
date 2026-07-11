/**
 * validation-response.builder.ts
 *
 * Thin, named wrapper over the existing `ErrorResponseBuilder.fromCode`
 * (B2.2) for the specific case of class-validator failures, formatting
 * `ValidationError[]` (from class-validator) into the `details` field of
 * the standard `ApiErrorResponse` envelope rather than passing the raw
 * class-validator error objects straight through.
 */

import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { ErrorResponseBuilder } from './error-response.builder';
import { ERROR_CODES } from '../constants/error-codes.constants';

export interface IFieldValidationIssue {
  field: string;
  constraints: string[];
}

/** Minimal shape compatible with class-validator's ValidationError, without importing the whole library type just for this. */
export interface IValidationErrorLike {
  property: string;
  constraints?: Record<string, string>;
  children?: IValidationErrorLike[];
}

function flatten(errors: IValidationErrorLike[], parentPath = ''): IFieldValidationIssue[] {
  const issues: IFieldValidationIssue[] = [];
  for (const err of errors) {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) {
      issues.push({ field: path, constraints: Object.values(err.constraints) });
    }
    if (err.children?.length) {
      issues.push(...flatten(err.children, path));
    }
  }
  return issues;
}

export class ValidationResponseBuilder {
  static build(path: string, errors: IValidationErrorLike[]): ApiErrorResponse {
    const issues = flatten(errors);
    return ErrorResponseBuilder.fromCode(
      path,
      422,
      ERROR_CODES.VALIDATION_FAILED,
      'One or more fields failed validation.',
      issues,
    );
  }
}
