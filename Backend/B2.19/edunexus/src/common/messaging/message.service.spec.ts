import { MessageService } from './message.service';
import { MessageRepository } from './repositories/message.repository';
import { MessageAttachmentRepository } from './repositories/message-attachment.repository';
import { MessageReactionRepository } from './repositories/message-reaction.repository';
import { MessageMentionRepository } from './repositories/message-mention.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { ConversationParticipantRepository } from './repositories/conversation-participant.repository';
import { MessageDeliveryService } from '../delivery/message-delivery.service';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { JobQueueService } from '../../infrastructure/jobs/job-queue.service';
import { InputSanitizerService } from '../../security/sanitizers/input-sanitizer.service';
import { FileSecurityService } from '../../security/helpers/file-security.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { MessageType } from './enums/message-type.enum';
import { ConversationType } from './enums/conversation-type.enum';
import { ParticipantRole } from './enums/participant-role.enum';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

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

function fakeMessage(overrides: Partial<MessageEntity> = {}): MessageEntity {
  return {
    id: 'msg-1',
    tenantId: 'tenant-1',
    schoolGroupId: null,
    schoolId: null,
    campusId: null,
    version: 1,
    conversationId: 'conv-1',
    senderId: 'sender-1',
    type: MessageType.TEXT,
    content: 'hello',
    replyToMessageId: null,
    forwardedFromMessageId: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'sender-1',
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

describe('MessageService', () => {
  let messageRepository: jest.Mocked<Pick<MessageRepository, 'create' | 'findById' | 'update' | 'listByConversation'>>;
  let attachmentRepository: jest.Mocked<Pick<MessageAttachmentRepository, 'batchCreate' | 'listByMessage'>>;
  let reactionRepository: jest.Mocked<Pick<MessageReactionRepository, 'findOneReaction' | 'create' | 'softDelete'>>;
  let mentionRepository: jest.Mocked<Pick<MessageMentionRepository, 'batchCreate'>>;
  let conversationRepository: jest.Mocked<Pick<ConversationRepository, 'findById' | 'touchLastMessageAt'>>;
  let participantRepository: jest.Mocked<
    Pick<ConversationParticipantRepository, 'findByConversationAndParticipant' | 'listByConversation'>
  >;
  let deliveryService: jest.Mocked<Pick<MessageDeliveryService, 'initializeReceipts'>>;
  let eventBus: jest.Mocked<Pick<EventBus, 'emit'>>;
  let jobQueue: jest.Mocked<Pick<JobQueueService, 'enqueue'>>;
  let sanitizer: jest.Mocked<Pick<InputSanitizerService, 'sanitizeString' | 'sanitizeObject'>>;
  let fileSecurity: jest.Mocked<Pick<FileSecurityService, 'validate'>>;
  let logger: jest.Mocked<Pick<AppLoggerService, 'log' | 'setContext'>>;
  let service: MessageService;

  beforeEach(() => {
    messageRepository = { create: jest.fn(), findById: jest.fn(), update: jest.fn(), listByConversation: jest.fn() };
    attachmentRepository = { batchCreate: jest.fn(), listByMessage: jest.fn() };
    reactionRepository = { findOneReaction: jest.fn(), create: jest.fn(), softDelete: jest.fn() };
    mentionRepository = { batchCreate: jest.fn() };
    conversationRepository = { findById: jest.fn(), touchLastMessageAt: jest.fn() };
    participantRepository = { findByConversationAndParticipant: jest.fn(), listByConversation: jest.fn() };
    deliveryService = { initializeReceipts: jest.fn() };
    eventBus = { emit: jest.fn() };
    jobQueue = { enqueue: jest.fn() };
    sanitizer = { sanitizeString: jest.fn((v: string) => v), sanitizeObject: jest.fn((v) => v) };
    fileSecurity = { validate: jest.fn() };
    logger = { log: jest.fn(), setContext: jest.fn() };

    service = new MessageService(
      messageRepository as unknown as MessageRepository,
      attachmentRepository as unknown as MessageAttachmentRepository,
      reactionRepository as unknown as MessageReactionRepository,
      mentionRepository as unknown as MessageMentionRepository,
      conversationRepository as unknown as ConversationRepository,
      participantRepository as unknown as ConversationParticipantRepository,
      deliveryService as unknown as MessageDeliveryService,
      eventBus as unknown as EventBus,
      jobQueue as unknown as JobQueueService,
      sanitizer as unknown as InputSanitizerService,
      fileSecurity as unknown as FileSecurityService,
      logger as unknown as AppLoggerService,
    );

    participantRepository.findByConversationAndParticipant.mockResolvedValue({
      id: 'membership-1',
      leftAt: null,
    } as never);
    participantRepository.listByConversation.mockResolvedValue([
      { participantId: 'sender-1' } as never,
      { participantId: 'recipient-1' } as never,
    ]);
  });

  describe('sendMessage', () => {
    it('throws when the conversation does not exist', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(
        service.sendMessage({ conversationId: 'conv-1', content: 'hi' }, 'tenant-1', 'sender-1'),
      ).rejects.toThrow(/was not found/);
    });

    it('throws when the conversation is locked', async () => {
      conversationRepository.findById.mockResolvedValue(fakeConversation({ isLocked: true }));

      await expect(
        service.sendMessage({ conversationId: 'conv-1', content: 'hi' }, 'tenant-1', 'sender-1'),
      ).rejects.toThrow(/is locked/);
    });

    it('throws when the sender is not an active participant', async () => {
      conversationRepository.findById.mockResolvedValue(fakeConversation());
      participantRepository.findByConversationAndParticipant.mockResolvedValue(null);

      await expect(
        service.sendMessage({ conversationId: 'conv-1', content: 'hi' }, 'tenant-1', 'sender-1'),
      ).rejects.toThrow(/not an active participant/);
    });

    it('creates the message, initializes receipts for other participants, and enqueues the notification fan-out job', async () => {
      conversationRepository.findById.mockResolvedValue(fakeConversation());
      const message = fakeMessage();
      messageRepository.create.mockResolvedValue(message);

      const result = await service.sendMessage(
        { conversationId: 'conv-1', content: 'hello there' },
        'tenant-1',
        'sender-1',
      );

      expect(result).toBe(message);
      expect(deliveryService.initializeReceipts).toHaveBeenCalledWith('msg-1', ['recipient-1'], 'tenant-1');
      expect(conversationRepository.touchLastMessageAt).toHaveBeenCalledWith('conv-1', 'tenant-1', message.createdAt);
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(jobQueue.enqueue).toHaveBeenCalledWith(
        expect.stringContaining('notify-participants'),
        expect.objectContaining({ messageId: 'msg-1', conversationId: 'conv-1', senderId: 'sender-1' }),
      );
    });
  });

  describe('editMessage', () => {
    it('throws when someone other than the sender tries to edit', async () => {
      messageRepository.findById.mockResolvedValue(fakeMessage({ senderId: 'sender-1' }));

      await expect(service.editMessage('msg-1', 'new content', 'tenant-1', 'someone-else')).rejects.toThrow(
        /Only the original sender/,
      );
    });

    it('throws when the message was already deleted', async () => {
      messageRepository.findById.mockResolvedValue(fakeMessage({ senderId: 'sender-1', isDeleted: true }));

      await expect(service.editMessage('msg-1', 'new content', 'tenant-1', 'sender-1')).rejects.toThrow(
        /cannot be edited/,
      );
    });
  });

  describe('reactToMessage', () => {
    it('is idempotent — returns the existing reaction instead of creating a duplicate', async () => {
      messageRepository.findById.mockResolvedValue(fakeMessage());
      const existing = { id: 'reaction-1' };
      reactionRepository.findOneReaction.mockResolvedValue(existing as never);

      const result = await service.reactToMessage('msg-1', 'participant-1', '👍', 'tenant-1');

      expect(result).toBe(existing);
      expect(reactionRepository.create).not.toHaveBeenCalled();
    });
  });
});
