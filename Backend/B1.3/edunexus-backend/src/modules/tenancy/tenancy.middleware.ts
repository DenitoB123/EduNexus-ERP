import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenancyService } from './tenancy.service';
import { School } from '@prisma/client';

export interface TenantRequest extends Request {
  tenantId: string | null;
  school: School | null;
}

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(private readonly tenancyService: TenancyService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
    // Resolution order:
    // 1. X-Tenant-ID header (slug or id)
    // 2. x-school-id header
    // 3. Host-based resolution (subdomain)
    // 4. None — request is global (unauthenticated or super-admin)

    const headerSlug =
      (req.headers['x-tenant-id'] as string) ??
      (req.headers['x-school-id'] as string) ??
      null;

    const host = req.headers.host ?? '';
    const subdomain = this.extractSubdomain(host);

    const identifier = headerSlug ?? subdomain ?? null;

    if (identifier) {
      const school = await this.tenancyService.resolveBySlugOrId(identifier);

      if (!school) {
        throw new NotFoundException(`Tenant '${identifier}' not found`);
      }

      if (!school.isActive) {
        throw new BadRequestException(`Tenant '${identifier}' is inactive`);
      }

      req.tenantId = school.id;
      req.school = school;
    } else {
      req.tenantId = null;
      req.school = null;
    }

    next();
  }

  private extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    // e.g. brightwood.edunexus.com → subdomain = 'brightwood'
    // Ignore www, api, app prefixes and bare domains (< 3 parts)
    if (parts.length < 3) return null;
    const sub = parts[0].toLowerCase();
    if (['www', 'api', 'app', 'admin'].includes(sub)) return null;
    return sub;
  }
}
