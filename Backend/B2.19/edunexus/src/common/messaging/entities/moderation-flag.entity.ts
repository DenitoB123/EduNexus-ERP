import { BaseCommEntity } from './base-comm-entity.interface';
import { ModerationStatus, ModerationTargetType } from '../enums/moderation.enum';

export interface ModerationFlagEntity extends BaseCommEntity {
  targetType: ModerationTargetType;
  targetId: string;
  flaggedBy: string;
  reason: string;
  status: ModerationStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  resolutionNote: string | null;
}
