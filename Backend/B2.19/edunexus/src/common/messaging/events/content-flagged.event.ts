import { DomainEvent } from '../../base/domain-event';
import { ModerationTargetType } from '../enums/moderation.enum';

export class ContentFlaggedEvent extends DomainEvent {
  constructor(
    public readonly flagId: string,
    public readonly targetType: ModerationTargetType,
    public readonly targetId: string,
    public readonly flaggedBy: string,
    tenantId: string,
  ) {
    super('messaging.moderation.content-flagged');
    this.tenantId = tenantId;
  }
}
