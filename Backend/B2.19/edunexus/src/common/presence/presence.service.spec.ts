import { PresenceService } from './presence.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PresenceStatus } from '../messaging/enums/presence-status.enum';

describe('PresenceService', () => {
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'del' | 'getClient'>>;
  let service: PresenceService;

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), getClient: jest.fn() };
    service = new PresenceService(redis as unknown as RedisService);
  });

  it('sets status and last-seen together', async () => {
    await service.setStatus('participant-1', 'tenant-1', PresenceStatus.ONLINE);

    expect(redis.set).toHaveBeenCalledWith('comm:presence:status:tenant-1:participant-1', PresenceStatus.ONLINE, 300);
    expect(redis.set).toHaveBeenCalledWith(
      'comm:presence:last-seen:tenant-1:participant-1',
      expect.any(String),
    );
  });

  it('defaults to OFFLINE when no status key exists', async () => {
    redis.get.mockResolvedValue(null);

    const snapshot = await service.getStatus('participant-1', 'tenant-1');

    expect(snapshot).toEqual({ participantId: 'participant-1', status: PresenceStatus.OFFLINE, lastSeenAt: null });
  });

  it('returns the stored status and last-seen when present', async () => {
    const lastSeen = new Date('2026-01-01T00:00:00.000Z');
    redis.get.mockResolvedValueOnce(PresenceStatus.AWAY).mockResolvedValueOnce(lastSeen.toISOString());

    const snapshot = await service.getStatus('participant-1', 'tenant-1');

    expect(snapshot.status).toBe(PresenceStatus.AWAY);
    expect(snapshot.lastSeenAt).toEqual(lastSeen);
  });

  it('heartbeat preserves an existing explicit status rather than forcing ONLINE', async () => {
    redis.get.mockResolvedValue(PresenceStatus.BUSY);

    await service.heartbeat('participant-1', 'tenant-1');

    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('status'), PresenceStatus.BUSY, 300);
  });

  it('heartbeat defaults to ONLINE when there is no existing status', async () => {
    redis.get.mockResolvedValue(null);

    await service.heartbeat('participant-1', 'tenant-1');

    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('status'), PresenceStatus.ONLINE, 300);
  });

  it('goOffline deletes the status key and stamps last-seen', async () => {
    await service.goOffline('participant-1', 'tenant-1');

    expect(redis.del).toHaveBeenCalledWith('comm:presence:status:tenant-1:participant-1');
    expect(redis.set).toHaveBeenCalledWith('comm:presence:last-seen:tenant-1:participant-1', expect.any(String));
  });

  it('getBulkStatus returns an empty array without touching Redis when given no IDs', async () => {
    const result = await service.getBulkStatus([], 'tenant-1');
    expect(result).toEqual([]);
    expect(redis.getClient).not.toHaveBeenCalled();
  });

  it('getBulkStatus maps mget results back onto each participant', async () => {
    const client = { mget: jest.fn() };
    client.mget
      .mockResolvedValueOnce([PresenceStatus.ONLINE, null])
      .mockResolvedValueOnce(['2026-01-01T00:00:00.000Z', null]);
    redis.getClient.mockReturnValue(client as never);

    const result = await service.getBulkStatus(['p1', 'p2'], 'tenant-1');

    expect(result).toEqual([
      { participantId: 'p1', status: PresenceStatus.ONLINE, lastSeenAt: new Date('2026-01-01T00:00:00.000Z') },
      { participantId: 'p2', status: PresenceStatus.OFFLINE, lastSeenAt: null },
    ]);
  });
});
