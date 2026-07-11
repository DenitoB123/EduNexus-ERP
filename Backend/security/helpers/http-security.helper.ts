import { SecurityConfig } from '../config/security.config';
import { CSP_DIRECTIVES } from '../constants/security.constants';

export class HttpSecurityHelper {
  static buildHelmetOptions(config: SecurityConfig): Record<string, unknown> {
    return {
      contentSecurityPolicy: config.enableCsp ? { directives: CSP_DIRECTIVES } : false,
      hsts: config.enableHsts
        ? { maxAge: config.hstsMaxAgeSeconds, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xFrameOptions: { action: 'deny' },
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    };
  }

  static buildCorsOptions(config: SecurityConfig): Record<string, unknown> {
    return {
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-tenant-id',
        'x-correlation-id',
        'x-request-id',
        'x-actor-id',
        'x-school-id',
        'x-campus-id',
      ],
      exposedHeaders: ['x-tenant-id', 'x-correlation-id'],
    };
  }
}
