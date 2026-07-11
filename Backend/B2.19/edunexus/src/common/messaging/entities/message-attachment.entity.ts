import { BaseCommEntity } from './base-comm-entity.interface';

export interface MessageAttachmentEntity extends BaseCommEntity {
  messageId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  durationSeconds: number | null;
}
