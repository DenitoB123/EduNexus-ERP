import { DomainEvent } from '../../../infrastructure/events/event.base';
import { REPORTING_EVENT_NAMES } from '../constants/reporting.constants';

export class ReportTemplateCreatedEvent extends DomainEvent {
  constructor(
    public readonly templateId: string,
    public readonly actorId: string | undefined,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.TEMPLATE_CREATED);
    this.tenantId = tenantId;
  }
}

export class ReportTemplateUpdatedEvent extends DomainEvent {
  constructor(
    public readonly templateId: string,
    public readonly actorId: string | undefined,
    tenantId: string,
  ) {
    super(REPORTING_EVENT_NAMES.TEMPLATE_UPDATED);
    this.tenantId = tenantId;
  }
}
