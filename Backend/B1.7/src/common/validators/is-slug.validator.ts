import { registerDecorator, ValidationOptions } from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validates lowercase, hyphen-separated slugs — used for School.slug, feature flag keys, etc. */
export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSlug',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && SLUG_REGEX.test(value) && value.length <= 100;
        },
        defaultMessage(): string {
          return `${propertyName} must be lowercase letters, numbers and hyphens only (e.g. 'green-valley-academy')`;
        },
      },
    });
  };
}
