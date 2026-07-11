import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption/encryption.service';
import { SecureRandomGenerator } from './encryption/secure-random.generator';
import { HashService } from './hash/hash.service';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { RequestFingerprintService } from './middleware/request-fingerprint.service';
import { SecurityInterceptor } from './middleware/security.interceptor';
import { SecurityGuard } from './middleware/security.guard';
import { RateLimitModule } from './middleware/rate-limit.module';
import { InputSanitizerService } from './sanitizers/input-sanitizer.service';
import { ResponseSanitizerService } from './sanitizers/response-sanitizer.service';
import { FileSecurityService } from './helpers/file-security.service';
import { EnvironmentSecretLoader } from './secrets/environment-secret.loader';
import { SecretManager } from './secrets/secret.manager';
import { SecurityAuditLogger } from './monitoring/security-audit.logger';
import { SuspiciousActivityLogger } from './monitoring/suspicious-activity.logger';
import { SecurityMetrics } from './monitoring/security-metrics.service';
import { SecurityHealthIndicator } from './monitoring/security-health.indicator';
import { SecurityService } from './security.service';

@Global()
@Module({
  imports: [RateLimitModule],
  providers: [
    EncryptionService,
    SecureRandomGenerator,
    HashService,
    RequestIdMiddleware,
    RequestFingerprintService,
    SecurityInterceptor,
    SecurityGuard,
    InputSanitizerService,
    ResponseSanitizerService,
    FileSecurityService,
    EnvironmentSecretLoader,
    SecretManager,
    SecurityAuditLogger,
    SuspiciousActivityLogger,
    SecurityMetrics,
    SecurityHealthIndicator,
    SecurityService,
  ],
  exports: [
    EncryptionService,
    SecureRandomGenerator,
    HashService,
    RequestIdMiddleware,
    RequestFingerprintService,
    SecurityInterceptor,
    SecurityGuard,
    InputSanitizerService,
    ResponseSanitizerService,
    FileSecurityService,
    SecretManager,
    SecurityAuditLogger,
    SuspiciousActivityLogger,
    SecurityMetrics,
    SecurityHealthIndicator,
    SecurityService,
  ],
})
export class SecurityModule {}
