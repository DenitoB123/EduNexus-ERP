import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(() => {
    const configMock = { security: { bcryptRounds: 4 } };
    service = new HashService(configMock as never);
  });

  it('hashes a value producing a bcrypt string', async () => {
    const hashed = await service.hash('my-password');
    expect(hashed).toMatch(/^\$2[ab]\$/);
  });

  it('compare() returns true for the original value', async () => {
    const hashed = await service.hash('correct-horse');
    expect(await service.compare('correct-horse', hashed)).toBe(true);
  });

  it('compare() returns false for a wrong value', async () => {
    const hashed = await service.hash('correct-horse');
    expect(await service.compare('wrong-value', hashed)).toBe(false);
  });

  it('safeCompare() uses constant-time equality', () => {
    expect(service.safeCompare('abc', 'abc')).toBe(true);
    expect(service.safeCompare('abc', 'xyz')).toBe(false);
    expect(service.safeCompare('abc', 'ab')).toBe(false);
  });
});
