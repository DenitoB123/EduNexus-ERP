import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContextData } from '../interfaces/tenant-context.interface';

/**
 * Holds per-request tenant/school/campus/actor context using
 * AsyncLocalStorage so it propagates through async call chains
 * without needing to thread parameters through every layer.
 *
 * This is infrastructure only — it does not resolve who the actor
 * is (no auth/session lookup). Resolution of TenantContextData is
 * the responsibility of a future Auth/Tenancy middleware in a later
 * phase; this service only stores and exposes whatever context is
 * set on it.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  run<T>(context: TenantContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  getActorId(): string | undefined {
    return this.storage.getStore()?.actorId;
  }

  getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('Tenant context is not set for this request');
    }
    return tenantId;
  }
}
