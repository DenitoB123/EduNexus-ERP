import { ModerationTargetType } from '../enums/moderation.enum';

export interface FlagContentInput {
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
}
