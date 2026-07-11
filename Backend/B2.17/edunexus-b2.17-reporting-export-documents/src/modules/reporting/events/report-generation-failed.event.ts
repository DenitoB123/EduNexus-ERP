import { DomainEvent } from '../../../infrastructure/events/event.base';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ReportGenerationFailedEvent extends DomainEvent {
  constructor(
    public readonly executionId: string,
    public readonly reportKey: string,
    public readonly errorMessage: string,
    public readonly attempts: number,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.GENERATION_FAILED);
    this.tenantId = tenantId;
  }
}
