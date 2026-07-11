import { BaseCommEntity } from './base-comm-entity.interface';
import { CollaborationActivityType } from '../enums/activity-type.enum';

export interface CollaborationActivityEntity extends BaseCommEntity {
  activityType: CollaborationActivityType;
  actorId: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
}
