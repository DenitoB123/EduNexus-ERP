import { DomainEvent } from '../../../infrastructure/events/event.base';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ReportGenerationCompletedEvent extends DomainEvent {
  constructor(
    public readonly executionId: string,
    public readonly reportKey: string,
    public readonly fileKey: string,
    public readonly rowCount: number,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.GENERATION_COMPLETED);
    this.tenantId = tenantId;
  }
}
