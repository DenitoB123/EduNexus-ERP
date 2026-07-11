import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data === null || data === undefined || typeof data !== 'object') return data;
        if (Buffer.isBuffer(data)) return data;

        // Only transforms instances of classes (i.e. objects with a
        // constructor other than plain Object), so plain response
        // envelopes (ApiResponse, etc.) built from object literals
        // pass through untouched — this only strips @Exclude()
        // fields off actual DTO/entity instances.
        if (data.constructor && data.constructor !== Object && data.constructor !== Array) {
          return instanceToPlain(data);
        }

        return data;
      }),
    );
  }
}
