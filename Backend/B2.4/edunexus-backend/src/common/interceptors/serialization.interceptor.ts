/**
 * serialization.interceptor.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Thin, reusable wrapper around class-transformer's `instanceToPlain`,
 * applied to the `data` field of an already-enveloped response (after
 * ResponseMappingInterceptor has run). Ensures fields marked `@Exclude()`
 * on entity/DTO classes (e.g. password hashes, internal tenant secrets)
 * never leak through generic controller responses, without every business
 * module wiring Nest's ClassSerializerInterceptor itself.
 *
 * Order matters: apply AFTER ResponseMappingInterceptor in the interceptor
 * chain (see ../decorators/api-crud-controller.decorator.ts) so it has an
 * enveloped `{ data }` shape to operate on.
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

interface IEnvelopeWithData {
  data?: unknown;
  [key: string]: unknown;
}

function serializeDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => serializeDeep(item));
  }
  if (value && typeof value === 'object' && value.constructor !== Object) {
    return instanceToPlain(value);
  }
  return value;
}

@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown) => {
        if (response && typeof response === 'object' && 'data' in (response as IEnvelopeWithData)) {
          const envelope = response as IEnvelopeWithData;
          return { ...envelope, data: serializeDeep(envelope.data) };
        }
        return serializeDeep(response);
      }),
    );
  }
}
