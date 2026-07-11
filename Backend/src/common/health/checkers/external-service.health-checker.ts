import { Inject, Injectable, Optional } from '@nestjs/common';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

export interface IExternalServiceProbe {
  readonly serviceName: string;
  isReachable(): Promise<boolean>;
}

export const EXTERNAL_SERVICE_PROBES = 'EXTERNAL_SERVICE_PROBES';

/**
 * No third-party HTTP dependency exists in the foundation today
 * (email/SMS/push in B2.2 are provider-abstracted but not
 * network-probed at health-check time). This checker is a live,
 * working composite over whatever gets registered against the
 * EXTERNAL_SERVICE_PROBES multi-provider token — with zero probes
 * registered it correctly reports "up" (nothing to check) rather
 * than a hardcoded stub, and a future payment gateway / SMS gateway
 * / SIS integration module registers a probe with no changes here.
 */
@Injectable()
export class ExternalServiceHealthChecker implements IHealthChecker {
  readonly name = 'external-services';
  readonly categories: HealthCheckCategory[] = ['dependency'];

  constructor(
    @Optional() @Inject(EXTERNAL_SERVICE_PROBES) private readonly probes: IExternalServiceProbe[] = [],
  ) {}

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      if (this.probes.length === 0) {
        return { state: 'up', details: { registeredProbes: 0 } };
      }

      const results = await Promise.all(
        this.probes.map(async (probe) => ({ service: probe.serviceName, reachable: await probe.isReachable() })),
      );
      const anyDown = results.some((r) => !r.reachable);

      return {
        state: anyDown ? 'degraded' : 'up',
        message: anyDown ? 'One or more external services are unreachable' : undefined,
        details: { registeredProbes: this.probes.length, results },
      };
    });
  }
}
