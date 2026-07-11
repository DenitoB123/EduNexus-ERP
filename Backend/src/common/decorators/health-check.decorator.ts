import { SetMetadata } from '@nestjs/common';

export const HEALTH_CHECK_METADATA = 'observability:health-check';

export interface HealthCheckMetadata {
  name: string;
}

/**
 * Marks a provider class as an IHealthChecker implementation and
 * records its declared name as reflect-metadata. Registration into
 * HealthAggregatorService today is explicit (see the HEALTH_CHECKERS
 * multi-provider array in observability.module.ts) rather than
 * reflection-based discovery — this decorator exists so that explicit
 * list can eventually be replaced by a DiscoveryModule-based explorer
 * (the same pattern infrastructure/events/event-subscriber.explorer.ts
 * already uses for @EventSubscriber) without changing every checker
 * class again.
 */
export function HealthCheck(name: string): ClassDecorator {
  return SetMetadata(HEALTH_CHECK_METADATA, { name } as HealthCheckMetadata);
}
