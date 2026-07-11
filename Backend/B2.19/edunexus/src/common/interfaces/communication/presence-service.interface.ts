import { PresenceStatus } from '../../messaging/enums/presence-status.enum';

export interface PresenceSnapshot {
  participantId: string;
  status: PresenceStatus;
  lastSeenAt: Date | null;
}

export interface IPresenceService {
  setStatus(participantId: string, tenantId: string, status: PresenceStatus): Promise<void>;

  getStatus(participantId: string, tenantId: string): Promise<PresenceSnapshot>;

  getBulkStatus(participantIds: string[], tenantId: string): Promise<PresenceSnapshot[]>;

  /** Refreshes last-seen without changing the explicit status (e.g. a websocket ping). */
  heartbeat(participantId: string, tenantId: string): Promise<void>;

  goOffline(participantId: string, tenantId: string): Promise<void>;
}
