import { DomainEvent } from '../../../infrastructure/events/event.base';
import { ExportFormat } from '../constants/export-format.enum';
import { ReportTriggerType } from '../constants/report-status.enum';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ReportGenerationRequestedEvent extends DomainEvent {
  constructor(
    public readonly executionId: string,
    public readonly reportKey: string,
    public readonly format: ExportFormat,
    public readonly triggerType: ReportTriggerType,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.GENERATION_REQUESTED);
    this.tenantId = tenantId;
  }
}
