export const PLATFORM_MODULE_METADATA_KEY = 'platform:module-metadata';

export interface PlatformModuleMetadata {
  /** Stable key, e.g. "reporting". Distinct from the NestJS class name. */
  key: string;
  displayName: string;
  description?: string;
  /** Semver-ish string; feature modules aren't required to track this, defaults to "1.0.0". */
  version?: string;
}
