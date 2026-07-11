/**
 * api-crud-controller.decorator.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * `@ApiCrudController(entityName)` is the composite class-level decorator
 * applied to every generated CRUD controller: route tagging, bearer-auth
 * documentation, tenant-protection default, and the standard interceptor
 * chain (logging -> performance -> response mapping), in one call. Exposed
 * separately from createCrudController (../controllers/crud.controller.ts)
 * so business modules writing a fully custom controller (not generated via
 * the factory) can still opt into the same conventions with one decorator.
 *
 * Also re-exports/aliases the other endpoint-level decorators under the
 * names called out in the B2.4 spec (`PublicEndpoint`, `PermissionProtected`)
 * for discoverability, alongside their canonical names in
 * authorization.decorators.ts.
 */

import { applyDecorators, Controller, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { PerformanceMonitoringInterceptor } from '../interceptors/performance-monitoring.interceptor';
import { ResponseMappingInterceptor } from '../interceptors/response-mapping.interceptor';
import { Public, Permissions, TenantProtected } from './authorization.decorators';

export const PublicEndpoint = Public;
export const PermissionProtected = Permissions;
export { TenantProtected };

export function ApiCrudController(entityName: string, path?: string) {
  return applyDecorators(
    Controller(path ?? entityName.toLowerCase()),
    ApiTags(entityName),
    ApiBearerAuth(),
    TenantProtected(true),
    UseInterceptors(LoggingInterceptor, PerformanceMonitoringInterceptor, ResponseMappingInterceptor),
  );
}
