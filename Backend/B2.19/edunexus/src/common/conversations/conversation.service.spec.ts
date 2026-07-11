import { ConversationService } from './conversation.service';
import { ConversationRepository } from '../messaging/repositories/conversation.repository';
import { ConversationParticipantRepository } from '../messaging/repositories/conversation-participant.repository';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { ConversationType } from '../messaging/enums/conversation-type.enum';
import { ParticipantRole } from '../messaging/enums/participant-role.enum';
import { ConversationEntity } from '../messaging/entities/conversation.entity';

function fakeConversation(overrides: Partial<ConversationEntity> = {}): ConversationEntity {
  return {
    id: 'conv-1',
    tenantId: 'tenant-1',
    schoolGroupId: null,
    schoolId: null,
    campusId: null,
    version: 1,
    type: ConversationType.GROUP,
    title: null,
    isLocked: false,
    lockedReason: null,
    linkedEntityType: null,
    linkedEntityId: null,
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'actor-1',
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

describe('ConversationService', () => {
  let conversationRepository: jest.Mocked<
    Pick<ConversationRepository, 'create' | 'findById' | 'findByIds' | 'findByLinkedEntity' | 'touchLastMessageAt'>
  >;
  let participantRepository: jest.Mocked<
    Pick<
      ConversationParticipantRepository,
      'batchCreate' | 'findByConversationAndParticipant' | 'listByParticipant' | 'create' | 'softDelete' | 'update'
    >
  >;
  let eventBus: jest.Mocked<Pick<EventBus, 'emit'>>;
  let logger: jest.Mocked<Pick<AppLoggerService, 'log' | 'setContext'>>;
  let service: ConversationService;

  beforeEach(() => {
    conversationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByLinkedEntity: jest.fn(),
      touchLastMessageAt: jest.fn(),
    };
    participantRepository = {
      batchCreate: jest.fn(),
      findByConversationAndParticipant: jest.fn(),
      listByParticipant: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };
    eventBus = { emit: jest.fn() };
    logger = { log: jest.fn(), setContext: jest.fn() };

    service = new ConversationService(
      conversationRepository as unknown as ConversationRepository,
      participantRepository as unknown as ConversationParticipantRepository,
      eventBus as unknown as EventBus,
      logger as unknown as AppLoggerService,
    );
  });

  describe('createConversation', () => {
    it('throws when no participants are given', async () => {
      await expect(
        service.createConversation(
          { type: ConversationType.GROUP, participantIds: [] },
          'tenant-1',
          'actor-1',
        ),
      ).rejects.toThrow(/at least one participant/);
      expect(conversationRepository.create).not.toHaveBeenCalled();
    });

    it('creates the conversation, adds the creator as OWNER, and emits an event', async () => {
      const conversation = fakeConversation();
      conversationRepository.create.mockResolvedValue(conversation);

      const result = await service.createConversation(
        { type: ConversationType.GROUP, participantIds: ['member-1', 'member-2'] },
        'tenant-1',
        'actor-1',
      );

      expect(result).toBe(conversation);
      expect(participantRepository.batchCreate).toHaveBeenCalledTimes(1);
      const [rows] = participantRepository.batchCreate.mock.calls[0];
      expect(rows).toHaveLength(3); // actor-1 + member-1 + member-2, deduped
      expect(rows.find((r: { participantId: string }) => r.participantId === 'actor-1')?.role).toBe(
        ParticipantRole.OWNER,
      );
      expect(rows.find((r: { participantId: string }) => r.participantId === 'member-1')?.role).toBe(
        ParticipantRole.MEMBER,
      );
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate the creator if they are also listed in participantIds', async () => {
      conversationRepository.create.mockResolvedValue(fakeConversation());

      await service.createConversation(
        { type: ConversationType.GROUP, participantIds: ['actor-1', 'member-1'] },
        'tenant-1',
        'actor-1',
      );

      const [rows] = participantRepository.batchCreate.mock.calls[0];
      expect(rows).toHaveLength(2);
    });
  });

  describe('getConversation', () => {
    it('throws when the conversation does not exist', async () => {
      conversationRepository.findById.mockResolvedValue(null);
      await expect(service.getConversation('missing', 'tenant-1')).rejects.toThrow(/was not found/);
    });
  });

  describe('addParticipant', () => {
    it('throws if the participant already belongs to the conversation', async () => {
      conversationRepository.findById.mockResolvedValue(fakeConversation());
      participantRepository.findByConversationAndParticipant.mockResolvedValue({
        id: 'p1',
      } as never);

      await expect(
        service.addParticipant('conv-1', 'member-1', ParticipantRole.MEMBER, 'tenant-1', 'actor-1'),
      ).rejects.toThrow(/already a participant/);
      expect(participantRepository.create).not.toHaveBeenCalled();
    });
  });
});
