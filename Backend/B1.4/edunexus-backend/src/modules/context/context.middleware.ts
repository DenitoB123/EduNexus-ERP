import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { ContextService } from './context.service';
import { TenantRequest } from '../tenancy/tenancy.middleware';

interface AuthenticatedRequest extends TenantRequest {
  user?: {
    sub: string;
    roles: string[];
  };
}

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly context: ContextService) {}

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ??
      `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.context.set({
      userId: req.user?.sub ?? null,
      role: req.user?.roles?.[0] ?? null,
      schoolId: req.tenantId ?? null,
      correlationId,
      ip: req.ip,
    });

    next();
  }
}
