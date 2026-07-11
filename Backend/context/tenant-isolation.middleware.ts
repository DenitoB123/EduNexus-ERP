import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';
import { TenantResolver } from './tenant.resolver';
import { TenantContextData } from '../interfaces/tenant-context.interface';

declare module 'express' {
  interface Request {
    tenantContext?: TenantContextData;
  }
}

@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly tenantResolver: TenantResolver,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const context = this.tenantResolver.resolve(req);
    req.tenantContext = context;
    res.setHeader('x-tenant-id', context.tenantId);
    this.tenantContextService.run(context, () => next());
  }
}
