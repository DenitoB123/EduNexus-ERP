/**
 * audit-search.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

import { Injectable } from '@nestjs/common';
import { AuditEventRepository } from './repositories/audit-event.repository';
import { IAuditSearchCriteria, IPagedResult } from '../interfaces/audit-service.interface';
import { IAuditEvent } from '../interfaces/audit-event.interface';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

@Injectable()
export class AuditSearchService {
  constructor(private readonly repository: AuditEventRepository) {}

  async search(criteria: IAuditSearchCriteria, page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<IPagedResult<IAuditEvent>> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    return this.repository.search(criteria, safePage, safePageSize);
  }

  async findByCorrelationId(tenantId: string, correlationId: string): Promise<IAuditEvent[]> {
    return this.repository.findByCorrelationId(tenantId, correlationId);
  }
}
