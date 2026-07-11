import { SetMetadata, Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CacheManager } from './cache-manager';
import { TtlPolicy } from './ttl-manager';

export const CACHEABLE_METADATA_KEY = 'edunexus:cacheable';

export interface CacheableMetadata {
  keyPrefix: string;
  ttlPolicy?: TtlPolicy;
}

export const Cacheable = (metadata: CacheableMetadata): MethodDecorator =>
  SetMetadata(CACHEABLE_METADATA_KEY, metadata);

@Injectable()
export class CacheableInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheManager: CacheManager,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<CacheableMetadata | undefined>(
      CACHEABLE_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ params: unknown; query: unknown }>();
    const cacheKey = [
      metadata.keyPrefix,
      JSON.stringify(request.params ?? {}),
      JSON.stringify(request.query ?? {}),
    ];

    return from(
      this.cacheManager.remember(cacheKey, () => firstValueFromObservable(next.handle()), {
        ttlPolicy: metadata.ttlPolicy,
      }),
    ).pipe(switchMap((value) => from([value])));
  }
}

function firstValueFromObservable<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next: (value) => {
        resolve(value);
        subscription.unsubscribe();
      },
      error: reject,
    });
  });
}
