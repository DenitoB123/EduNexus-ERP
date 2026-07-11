import { DomainEvent } from '../../../infrastructure/events/event.base';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ScheduledReportCreatedEvent extends DomainEvent {
  constructor(
    public readonly scheduledReportId: string,
    public readonly actorId: string | undefined,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.SCHEDULE_CREATED);
    this.tenantId = tenantId;
  }
}

export class ScheduledReportUpdatedEvent extends DomainEvent {
  constructor(
    public readonly scheduledReportId: string,
    public readonly actorId: string | undefined,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.SCHEDULE_UPDATED);
    this.tenantId = tenantId;
  }
}

export class ScheduledReportRemovedEvent extends DomainEvent {
  constructor(
    public readonly scheduledReportId: string,
    public readonly actorId: string | undefined,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.SCHEDULE_REMOVED);
    this.tenantId = tenantId;
  }
}
