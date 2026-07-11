import { XssProtectionHelper } from './xss-protection.helper';
import { SqlInjectionHelper } from './sql-injection.helper';

describe('XssProtectionHelper', () => {
  it('strips script tags', () => {
    const result = XssProtectionHelper.stripTags('<script>alert(1)</script>Hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello');
  });

  it('sanitizes javascript: protocol', () => {
    const result = XssProtectionHelper.sanitize('javascript:alert(1)');
    expect(result).not.toContain('javascript:');
  });

  it('removes event handler attributes', () => {
    const result = XssProtectionHelper.sanitize('<img onerror=alert(1)>');
    expect(result).not.toContain('onerror');
  });

  it('isClean returns false for script injection', () => {
    expect(XssProtectionHelper.isClean('<script>alert(1)</script>')).toBe(false);
  });

  it('isClean returns true for clean input', () => {
    expect(XssProtectionHelper.isClean('Hello, World!')).toBe(true);
  });
});

describe('SqlInjectionHelper', () => {
  it('detects SQL keywords in input', () => {
    expect(SqlInjectionHelper.containsSqlPattern('1 OR 1=1; DROP TABLE users')).toBe(true);
    expect(SqlInjectionHelper.containsSqlPattern("' OR '1'='1")).toBe(true);
  });

  it('returns false for clean input', () => {
    expect(SqlInjectionHelper.containsSqlPattern('John Smith')).toBe(false);
  });

  it('strips comment tokens on sanitize', () => {
    const result = SqlInjectionHelper.sanitize("admin'--");
    expect(result).not.toContain('--');
  });
});
