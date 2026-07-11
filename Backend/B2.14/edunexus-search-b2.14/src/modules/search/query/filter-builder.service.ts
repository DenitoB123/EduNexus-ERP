/**
 * filter-builder.service.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure — Query Layer
 *
 * Parses the raw JSON `?filter=` string into a structured ISearchFilters
 * object, then unconditionally merges in tenant isolation (never trusts a
 * client-supplied tenantId — always overwritten from context) and, when
 * available, an RBAC-derived visibility constraint from IPermissionChecker
 * (extension point — see interfaces/infrastructure.interfaces.ts).
 */

import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { ISearchFilters } from '../interfaces/search-query.interface';
import { ISearchRequestContext, IPermissionChecker } from '../interfaces/infrastructure.interfaces';
import { PERMISSION_CHECKER } from '../constants/tokens';

@Injectable()
export class FilterBuilderService {
  constructor(@Optional() @Inject(PERMISSION_CHECKER) private readonly permissionChecker?: IPermissionChecker) {}

  build(rawFilter: string | undefined, context: ISearchRequestContext): ISearchFilters {
    const parsed = this.parseRaw(rawFilter);

    // Tenant isolation is mandatory and never client-controlled, unless the
    // actor is explicitly performing a cross-tenant operation (platform
    // admin), per context.tenant.isCrossTenantOperation.
    const filters: ISearchFilters = {
      ...parsed,
      tenantId: context.tenant.isCrossTenantOperation ? parsed.tenantId : context.tenant.tenantId,
    };

    if (!context.tenant.isCrossTenantOperation) {
      if (context.tenant.campusId) filters.campusId = context.tenant.campusId;
      if (context.tenant.departmentId) filters.departmentId = context.tenant.departmentId;
    }

    return filters;
  }

  /** Resolves the RBAC visibility filter (if the injected IPermissionChecker supports it) for the given context/entityType, merged by SearchService into the engine call. */
  async resolveVisibilityFilter(
    context: ISearchRequestContext,
    entityType?: string,
  ): Promise<Record<string, unknown> | undefined> {
    if (!this.permissionChecker?.buildVisibilityFilter) {
      return undefined;
    }
    return this.permissionChecker.buildVisibilityFilter(context, entityType);
  }

  private parseRaw(rawFilter: string | undefined): ISearchFilters {
    if (!rawFilter) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawFilter);
    } catch {
      throw new BadRequestException('filter must be valid JSON.');
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new BadRequestException('filter must be a JSON object.');
    }
    return parsed as ISearchFilters;
  }
}
