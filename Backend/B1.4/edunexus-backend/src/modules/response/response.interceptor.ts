import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from './response.interface';

export const SKIP_RESPONSE_WRAPPER = 'skipResponseWrapper';
export const RESPONSE_MESSAGE_KEY = 'responseMessage';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_WRAPPER,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
