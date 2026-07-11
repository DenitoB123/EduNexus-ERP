import { registerDecorator, ValidationOptions } from 'class-validator';

const CUID_REGEX = /^c[a-z0-9]{24}$/i;

/**
 * Validates that a string is a syntactically valid cuid — the id format
 * used by every Prisma model in this project (`@id @default(cuid())`).
 * Catches the common mistake of accepting a UUID-shaped string (or any
 * arbitrary string) where a real entity id is expected, before it ever
 * reaches a Prisma query.
 */
export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && CUID_REGEX.test(value);
        },
        defaultMessage(): string {
          return `${propertyName} must be a valid identifier`;
        },
      },
    });
  };
}
