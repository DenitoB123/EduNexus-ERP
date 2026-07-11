import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { API_HEADER_CONSTANTS, API_VERSION_CONSTANTS } from '../constants/api.constants';

@Injectable()
export class ApiMetadataMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    res.setHeader(API_VERSION_CONSTANTS.VERSION_HEADER, API_VERSION_CONSTANTS.DEFAULT_VERSION);

    const correlationId = req.headers[API_HEADER_CONSTANTS.CORRELATION_ID];
    if (correlationId) {
      res.setHeader(API_HEADER_CONSTANTS.CORRELATION_ID, correlationId);
    }

    const requestId = req.headers[API_HEADER_CONSTANTS.REQUEST_ID];
    if (requestId) {
      res.setHeader(API_HEADER_CONSTANTS.REQUEST_ID, requestId);
    }

    next();
  }
}
