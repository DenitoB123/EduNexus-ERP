import { InputSanitizerService } from './input-sanitizer.service';
import { ResponseSanitizerService } from './response-sanitizer.service';

describe('InputSanitizerService', () => {
  const service = new InputSanitizerService();

  it('sanitizes string values recursively in an object', () => {
    const dirty = { name: '<script>alert(1)</script>Alice', age: 30 };
    const clean = service.sanitizeObject(dirty);
    expect(clean.name).not.toContain('<script>');
    expect(clean.age).toBe(30);
  });

  it('sanitizes nested objects', () => {
    const dirty = { address: { street: '<b>Main</b> St' } };
    const clean = service.sanitizeObject(dirty);
    expect(clean.address.street).not.toContain('<b>');
  });

  it('sanitizes strings inside arrays', () => {
    const dirty = { tags: ['<img onerror=1>', 'clean'] };
    const clean = service.sanitizeObject(dirty as Record<string, unknown>);
    expect((clean.tags as string[])[0]).not.toContain('onerror');
  });
});

describe('ResponseSanitizerService', () => {
  const service = new ResponseSanitizerService();

  it('redacts password fields', () => {
    const response = service.maskSensitiveFields({ id: '1', password: 'secret123', name: 'Alice' });
    expect(response.password).toBe('[REDACTED]');
    expect(response.name).toBe('Alice');
  });

  it('masks email addresses', () => {
    const response = service.maskSensitiveFields({ email: 'alice@example.com' });
    expect(response.email).not.toBe('alice@example.com');
    expect(response.email as string).toContain('@example.com');
    expect(response.email as string).toContain('*');
  });

  it('recurses into nested objects', () => {
    const response = service.maskSensitiveFields({ user: { password: 'secret', role: 'admin' } });
    expect((response.user as Record<string, unknown>).password).toBe('[REDACTED]');
    expect((response.user as Record<string, unknown>).role).toBe('admin');
  });
});
