import { Injectable } from '@nestjs/common';

export interface SecurityMetricsSnapshot {
  rateLimitExceededCount: number;
  suspiciousPayloadCount: number;
  invalidOriginCount: number;
  permissionDeniedCount: number;
}

@Injectable()
export class SecurityMetrics {
  private rateLimitExceededCount = 0;
  private suspiciousPayloadCount = 0;
  private invalidOriginCount = 0;
  private permissionDeniedCount = 0;

  recordRateLimitExceeded(): void {
    this.rateLimitExceededCount += 1;
  }

  recordSuspiciousPayload(): void {
    this.suspiciousPayloadCount += 1;
  }

  recordInvalidOrigin(): void {
    this.invalidOriginCount += 1;
  }

  recordPermissionDenied(): void {
    this.permissionDeniedCount += 1;
  }

  getSnapshot(): SecurityMetricsSnapshot {
    return {
      rateLimitExceededCount: this.rateLimitExceededCount,
      suspiciousPayloadCount: this.suspiciousPayloadCount,
      invalidOriginCount: this.invalidOriginCount,
      permissionDeniedCount: this.permissionDeniedCount,
    };
  }
}
