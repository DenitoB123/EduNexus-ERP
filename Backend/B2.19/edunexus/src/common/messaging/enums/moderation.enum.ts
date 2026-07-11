/** Mirror `ModerationTargetType` / `ModerationStatus` in prisma/schema.prisma. */
export enum ModerationTargetType {
  MESSAGE = 'MESSAGE',
  CONVERSATION = 'CONVERSATION',
}

export enum ModerationStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
  ACTIONED = 'ACTIONED',
}
