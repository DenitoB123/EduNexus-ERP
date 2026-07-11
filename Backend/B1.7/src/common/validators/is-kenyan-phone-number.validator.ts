import { registerDecorator, ValidationOptions } from 'class-validator';

// Accepts 07XXXXXXXX, 01XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX — the formats
// users actually type into a form vs. what M-Pesa/Africa's Talking expect.
const KENYAN_PHONE_REGEX = /^(?:\+?254|0)([17]\d{8})$/;

/**
 * Validates East African (Kenyan) phone number formats. Pan-African by
 * design this codebase is, but Kenya is the primary reference market
 * (memory: pilot schools, M-Pesa integration) so this is the first concrete
 * validator; additional country patterns can be added the same way as
 * other markets onboard.
 */
export function IsKenyanPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isKenyanPhoneNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && KENYAN_PHONE_REGEX.test(value);
        },
        defaultMessage(): string {
          return `${propertyName} must be a valid Kenyan phone number (e.g. 0712345678 or +254712345678)`;
        },
      },
    });
  };
}

/** Normalizes any accepted format to MSISDN (2547XXXXXXXX) — what M-Pesa/Africa's Talking expect. */
export function toKenyanMsisdn(rawPhone: string): string {
  const match = KENYAN_PHONE_REGEX.exec(rawPhone);
  if (!match) {
    throw new Error(`'${rawPhone}' is not a valid Kenyan phone number`);
  }
  return `254${match[1]}`;
}
