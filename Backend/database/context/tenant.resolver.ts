import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { TenantContextData } from '../interfaces/tenant-context.interface';

/**
 * Resolves TenantContextData from an incoming request.
 *
 * Foundation-only: reads plain headers. There is no Auth/Users module
 * yet, so no session/JWT-derived tenant resolution happens here. A
 * later phase should replace or extend this resolver once identity
 * is available, without changing the TenantContextService contract.
 */
@Injectable()
export class TenantResolver {
  resolve(request: Request): TenantContextData {
    const header = (name: string): string | undefined => {
      const value = request.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    return {
      tenantId: header('x-tenant-id') ?? 'public',
      schoolGroupId: header('x-school-group-id'),
      schoolId: header('x-school-id'),
      campusId: header('x-campus-id'),
      actorId: header('x-actor-id'),
      correlationId: header('x-correlation-id') ?? randomUUID(),
    };
  }
}
