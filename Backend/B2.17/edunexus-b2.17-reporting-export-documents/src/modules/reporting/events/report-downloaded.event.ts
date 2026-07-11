import { DomainEvent } from '../../../infrastructure/events/event.base';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ReportDownloadedEvent extends DomainEvent {
  constructor(
    public readonly executionId: string,
    public readonly actorId: string | undefined,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.DOWNLOADED);
    this.tenantId = tenantId;
  }
}
