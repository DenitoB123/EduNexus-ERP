import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  it('returns undefined context outside of run()', () => {
    expect(service.getContext()).toBeUndefined();
    expect(service.getTenantId()).toBeUndefined();
  });

  it('exposes context set via run()', () => {
    service.run({ tenantId: 'tenant-1', correlationId: 'corr-1' }, () => {
      expect(service.getTenantId()).toBe('tenant-1');
      expect(service.getCorrelationId()).toBe('corr-1');
    });
  });

  it('propagates context across async boundaries', async () => {
    await service.run({ tenantId: 'tenant-async' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(service.getTenantId()).toBe('tenant-async');
    });
  });

  it('requireTenantId throws when context is missing', () => {
    expect(() => service.requireTenantId()).toThrow('Tenant context is not set for this request');
  });

  it('requireTenantId returns tenantId when context is set', () => {
    service.run({ tenantId: 'tenant-required' }, () => {
      expect(service.requireTenantId()).toBe('tenant-required');
    });
  });
});
