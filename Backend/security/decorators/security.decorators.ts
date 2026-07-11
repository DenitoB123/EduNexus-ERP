import { SetMetadata } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

export const SKIP_SECURITY_KEY = 'edunexus:skip-security';
export const REQUIRE_FINGERPRINT_KEY = 'edunexus:require-fingerprint';
export const AUDIT_LOG_KEY = 'edunexus:audit-log';

export const SkipSecurity = (): ClassDecorator & MethodDecorator =>
  SetMetadata(SKIP_SECURITY_KEY, true);

export const RequireFingerprint = (): MethodDecorator =>
  SetMetadata(REQUIRE_FINGERPRINT_KEY, true);

export const AuditLog = (action: string): MethodDecorator =>
  SetMetadata(AUDIT_LOG_KEY, action);

export { SkipThrottle };
