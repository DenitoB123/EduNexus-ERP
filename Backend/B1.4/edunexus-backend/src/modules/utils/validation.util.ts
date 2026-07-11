import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export async function validateDto<T extends object>(
  DtoClass: new () => T,
  plain: Record<string, unknown>,
): Promise<{ valid: boolean; errors: string[] }> {
  const instance = plainToInstance(DtoClass, plain);
  const errors: ValidationError[] = await validate(instance);

  if (errors.length === 0) {
    return { valid: true, errors: [] };
  }

  const messages = errors.flatMap((e) =>
    Object.values(e.constraints ?? {}).map(String),
  );
  return { valid: false, errors: messages };
}

export function isUuid(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isPhoneNumber(value: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(value);
}

export function isStrongPassword(value: string): boolean {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const strongRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(value);
}

export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>'"]/g, '');
}

export function assertNonNull<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}
