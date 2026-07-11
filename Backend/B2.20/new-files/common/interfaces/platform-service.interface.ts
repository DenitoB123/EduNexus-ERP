/**
 * Marker interface for services that expose platform-level (as
 * opposed to business-domain) capability. Implementing this is
 * optional — it exists so future platform services can be discovered
 * generically (e.g. by ModuleDiscoveryService filtering providers
 * whose class implements IPlatformService) without a hard-coded list.
 */
export interface IPlatformService {
  /** Stable, human-readable identifier, e.g. "reporting", "notifications". */
  readonly platformServiceName: string;
}
