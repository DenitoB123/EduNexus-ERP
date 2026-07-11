import { randomUUID } from 'crypto';
import { Request } from 'express';

export class CorrelationIdUtil {
  static resolve(request: Request): string {
    const header = request.headers['x-correlation-id'];
    const existing = Array.isArray(header) ? header[0] : header;
    return existing ?? randomUUID();
  }
}
