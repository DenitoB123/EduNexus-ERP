import { SecurityMetrics } from './security-metrics.service';
import { SecurityAuditLogger } from './security-audit.logger';

describe('SecurityMetrics', () => {
  it('tracks all event counters independently', () => {
    const metrics = new SecurityMetrics();
    metrics.recordRateLimitExceeded();
    metrics.recordRateLimitExceeded();
    metrics.recordSuspiciousPayload();
    metrics.recordPermissionDenied();

    expect(metrics.getSnapshot()).toEqual({
      rateLimitExceededCount: 2,
      suspiciousPayloadCount: 1,
      invalidOriginCount: 0,
      permissionDeniedCount: 1,
    });
  });
});

describe('SecurityAuditLogger', () => {
  it('logs a warning for each security event type', () => {
    const loggerMock = { setContext: jest.fn(), warn: jest.fn() };
    const auditLogger = new SecurityAuditLogger(loggerMock as never);

    auditLogger.rateLimitExceeded('192.168.1.1', 'corr-1');
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('RATE_LIMIT_EXCEEDED'),
    );

    auditLogger.suspicious('10.0.0.1', 'SQL pattern detected');
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('SUSPICIOUS_PAYLOAD'),
    );
  });
});
