import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint } from 'class-validator';
import { BaseValidator } from './base.validator';
import { UuidUtil } from '../utils/uuid.util';

@ValidatorConstraint({ name: 'isValidTenantId', async: false })
export class IsValidTenantIdConstraint extends BaseValidator {
  validate(value: unknown): boolean {
    return typeof value === 'string' && (value === 'public' || UuidUtil.isValid(value));
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid tenant identifier`;
  }
}

export function IsValidTenantId(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsValidTenantIdConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidPageNumber', async: false })
export class IsValidPageNumberConstraint extends BaseValidator {
  validate(value: unknown): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be an integer greater than or equal to 1`;
  }
}

export function IsValidPageNumber(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsValidPageNumberConstraint,
    });
  };
}
