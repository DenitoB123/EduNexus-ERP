import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { SECURITY_CONSTANTS } from '../constants/security.constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers[SECURITY_CONSTANTS.REQUEST_ID_HEADER] as string | undefined;
    const requestId = existing ?? randomUUID();
    req.headers[SECURITY_CONSTANTS.REQUEST_ID_HEADER] = requestId;
    res.setHeader(SECURITY_CONSTANTS.REQUEST_ID_HEADER, requestId);
    next();
  }
}
