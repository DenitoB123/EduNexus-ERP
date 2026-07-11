import { DomainEvent } from '../../../infrastructure/events/event.base';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ScheduledReportExecutedEvent extends DomainEvent {
  constructor(
    public readonly scheduledReportId: string,
    public readonly executionId: string,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.SCHEDULED_REPORT_EXECUTED);
    this.tenantId = tenantId;
  }
}
