import { DomainEvent } from '../../../infrastructure/events/event.base';

export class DocumentTemplateCreatedEvent extends DomainEvent {
  constructor(
    public readonly templateId: string,
    public readonly actorId: string | undefined,
    public readonly tenantId: string,
  ) {
    super('document.template.created');
  }
}

export class DocumentTemplateUpdatedEvent extends DomainEvent {
  constructor(
    public readonly templateId: string,
    public readonly actorId: string | undefined,
    public readonly tenantId: string,
  ) {
    super('document.template.updated');
  }
}

export class DocumentGenerationCompletedEvent extends DomainEvent {
  constructor(
    public readonly generationId: string,
    public readonly type: string,
    public readonly tenantId: string,
    public readonly fileKey: string,
  ) {
    super('document.generation.completed');
  }
}

export class DocumentGenerationFailedEvent extends DomainEvent {
  constructor(
    public readonly generationId: string,
    public readonly type: string,
    public readonly tenantId: string,
    public readonly reason: string,
  ) {
    super('document.generation.failed');
  }
}
