import { API_VERSION_CONSTANTS } from '../constants/api.constants';

export class VersionRegistry {
  private static readonly supported = new Set<string>(API_VERSION_CONSTANTS.SUPPORTED_VERSIONS);

  static isSupported(version: string): boolean {
    return this.supported.has(version);
  }

  static list(): string[] {
    return Array.from(this.supported);
  }

  static default(): string {
    return API_VERSION_CONSTANTS.DEFAULT_VERSION;
  }
}

export class VersionHelpers {
  static parseFromHeader(header: string | undefined): string {
    if (!header) return VersionRegistry.default();
    const v = header.replace(/^v/i, '');
    return VersionRegistry.isSupported(v) ? v : VersionRegistry.default();
  }

  static toUriSegment(version: string): string {
    return `v${version}`;
  }
}
