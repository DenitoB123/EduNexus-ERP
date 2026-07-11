import { VersionRegistry, VersionHelpers } from './version.registry';

describe('VersionRegistry', () => {
  it('reports the default version as supported', () => {
    expect(VersionRegistry.isSupported(VersionRegistry.default())).toBe(true);
  });

  it('reports an unknown version as unsupported', () => {
    expect(VersionRegistry.isSupported('99')).toBe(false);
  });

  it('lists supported versions', () => {
    expect(VersionRegistry.list()).toContain('1');
  });
});

describe('VersionHelpers', () => {
  it('parses a supported version from a header', () => {
    expect(VersionHelpers.parseFromHeader('v1')).toBe('1');
    expect(VersionHelpers.parseFromHeader('1')).toBe('1');
  });

  it('falls back to default for missing or unsupported header', () => {
    expect(VersionHelpers.parseFromHeader(undefined)).toBe(VersionRegistry.default());
    expect(VersionHelpers.parseFromHeader('v99')).toBe(VersionRegistry.default());
  });

  it('builds a URI segment from a version', () => {
    expect(VersionHelpers.toUriSegment('1')).toBe('v1');
  });
});
