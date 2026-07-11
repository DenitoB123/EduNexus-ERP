/**
 * activity-timeline.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Timelines for users/students/staff/parents/institutions/resources are
 * all the same query shape: every AuditEvent for a given actor, or every
 * AuditEvent for a given entityType+entityId. There's deliberately no
 * per-subject-type method (getStudentTimeline, getStaffTimeline, ...) —
 * "Student"/"Staff"/"Parent" are just entityType values a future business
 * module passes in; hardcoding one method per type here would be
 * duplicating the same query six times for no behavioral difference.
 */

import { Injectable } from '@nestjs/common';
import { AuditEventRepository } from './repositories/audit-event.repository';
import { IAuditEvent } from '../interfaces/audit-event.interface';
import { IPagedResult } from '../interfaces/audit-service.interface';

const DEFAULT_PAGE_SIZE = 100;

@Injectable()
export class ActivityTimelineService {
  constructor(private readonly repository: AuditEventRepository) {}

  /** Timeline of everything a given actor (user/staff/parent/etc.) did. */
  async getActorTimeline(tenantId: string, actorId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<IPagedResult<IAuditEvent>> {
    return this.repository.search({ tenantId, actorId }, page, pageSize);
  }

  /** Timeline of everything that happened to a given entity (a Student record, an Institution, any resource). */
  async getEntityTimeline(
    tenantId: string,
    entityType: string,
    entityId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<IPagedResult<IAuditEvent>> {
    return this.repository.search({ tenantId, entityType, entityId }, page, pageSize);
  }
}
