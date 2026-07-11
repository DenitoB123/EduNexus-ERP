/**
 * payload-validation.util.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Thin wrapper around `class-validator` (already a project dependency,
 * used the same way by B2.8's CommandValidationBehavior) so job payloads
 * declared as DTOs get the same structural validation as CQRS
 * commands/queries before they're ever enqueued.
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ClassConstructor } from 'class-transformer';

export class PayloadValidationUtil {
  static async assertValid<T extends object>(dtoClass: ClassConstructor<T>, payload: unknown): Promise<T> {
    const instance = plainToInstance(dtoClass, payload);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new Error(`Job payload validation failed: ${messages.join('; ')}`);
    }

    return instance;
  }
}
