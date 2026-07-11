import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  IsStrongPasswordConstraint,
  IsFutureDateConstraint,
  IsSlugConstraint,
  IsE164PhoneConstraint,
} from './custom.validators';

export function IsStrongPassword(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

export function IsFutureDate(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

export function IsSlug(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsSlugConstraint,
    });
  };
}

export function IsE164Phone(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsE164PhoneConstraint,
    });
  };
}
