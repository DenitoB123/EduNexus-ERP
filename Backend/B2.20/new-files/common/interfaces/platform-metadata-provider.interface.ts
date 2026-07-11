export interface PlatformBuildInfo {
  version: string;
  commitSha?: string;
  builtAt?: string;
  nodeVersion: string;
}

export interface PlatformCapabilities {
  /** Domain-agnostic infrastructure capabilities the platform currently exposes to business modules. */
  cache: boolean;
  queue: boolean;
  scheduler: boolean;
  eventBus: boolean;
  storage: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface InstalledModuleSummary {
  name: string;
  providerCount: number;
  controllerCount: number;
}

export interface PlatformMetadata {
  name: string;
  environment: string;
  build: PlatformBuildInfo;
  capabilities: PlatformCapabilities;
  installedModules: InstalledModuleSummary[];
  uptimeSeconds: number;
}

/**
 * Implemented by PlatformMetadataService (common/platform). Answers
 * "what is this deployment, what version, and what can it do" —
 * consumed by the platform controller and useful for support/ops
 * tooling and future admin dashboards.
 */
export interface IPlatformMetadataProvider {
  getMetadata(): PlatformMetadata;
}
