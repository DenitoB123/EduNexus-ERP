import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service';
import { CorrelationIdUtil } from './correlation-id.util';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = CorrelationIdUtil.resolve(req);

    this.requestContextService.run(
      { correlationId, method: req.method, url: req.originalUrl, startTime: Date.now() },
      () => next(),
    );
  }
}
