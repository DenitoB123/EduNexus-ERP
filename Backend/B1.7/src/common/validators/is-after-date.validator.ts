import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Cross-field date validator: asserts `this[propertyName]` is strictly after
 * `this[relatedPropertyName]`. Useful for date-range DTOs across the
 * platform (academic term start/end, fee due windows, webhook subscription
 * active-from/to) without re-deriving the same comparison logic per module.
 */
export function IsAfterDate(relatedPropertyName: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [relatedPropertyName],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedField] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[relatedField];
          if (!value || !relatedValue) return true; // let @IsDate/@IsNotEmpty handle presence
          return new Date(value as string).getTime() > new Date(relatedValue as string).getTime();
        },
        defaultMessage(args: ValidationArguments): string {
          return `${propertyName} must be after ${args.constraints[0]}`;
        },
      },
    });
  };
}
