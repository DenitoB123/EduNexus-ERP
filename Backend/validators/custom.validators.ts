import { ValidationArguments, ValidatorConstraint } from 'class-validator';
import { BaseValidator } from './base.validator';
import { VALIDATION_RULES } from './validation.rules';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint extends BaseValidator {
  validate(value: unknown): boolean {
    return typeof value === 'string' && VALIDATION_RULES.STRONG_PASSWORD_PATTERN.test(value);
  }

  defaultMessage(): string {
    return 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol';
  }
}

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint extends BaseValidator {
  validate(value: unknown): boolean {
    const date = value instanceof Date ? value : new Date(value as string);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a date in the future`;
  }
}

@ValidatorConstraint({ name: 'isSlug', async: false })
export class IsSlugConstraint extends BaseValidator {
  validate(value: unknown): boolean {
    return typeof value === 'string' && VALIDATION_RULES.SLUG_PATTERN.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a lowercase, hyphen-separated slug`;
  }
}

@ValidatorConstraint({ name: 'isE164Phone', async: false })
export class IsE164PhoneConstraint extends BaseValidator {
  validate(value: unknown): boolean {
    return typeof value === 'string' && VALIDATION_RULES.E164_PHONE_PATTERN.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid E.164 phone number (e.g. +14155552671)`;
  }
}
