import { Request } from 'express';
import { IApiRequestContext } from '../interfaces/api.interfaces';
import { VersionHelpers } from '../versioning/version.registry';
import { API_HEADER_CONSTANTS } from '../constants/api.constants';

export class ApiRequestContextHelper {
  static extract(req: Request): IApiRequestContext {
    const header = (name: string): string | undefined => {
      const val = req.headers[name];
      return Array.isArray(val) ? val[0] : val;
    };

    return {
      tenantId: header(API_HEADER_CONSTANTS.TENANT_ID) ?? 'public',
      correlationId: header(API_HEADER_CONSTANTS.CORRELATION_ID),
      actorId: req.tenantContext?.actorId,
      apiVersion: VersionHelpers.parseFromHeader(header('accept-version')),
      requestedAt: new Date(),
    };
  }
}
