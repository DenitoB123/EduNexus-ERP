import { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';

export abstract class BaseValidator implements ValidatorConstraintInterface {
  abstract validate(value: unknown, args: ValidationArguments): boolean | Promise<boolean>;
  abstract defaultMessage(args: ValidationArguments): string;
}
