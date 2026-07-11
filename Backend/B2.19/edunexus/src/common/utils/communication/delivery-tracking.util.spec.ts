import { DeliveryTrackingUtil } from './delivery-tracking.util';
import { DeliveryStatus } from '../../messaging/enums/delivery-status.enum';
import { MessageDeliveryReceiptEntity } from '../../messaging/entities/message-delivery-receipt.entity';

function receipt(status: DeliveryStatus): MessageDeliveryReceiptEntity {
  return {
    id: 'r1',
    tenantId: 't1',
    schoolGroupId: null,
    schoolId: null,
    campusId: null,
    version: 1,
    messageId: 'm1',
    participantId: 'p1',
    status,
    statusAt: new Date(),
    retryCount: 0,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
  };
}

describe('DeliveryTrackingUtil.summarize', () => {
  it('counts receipts by status', () => {
    const receipts = [
      receipt(DeliveryStatus.QUEUED),
      receipt(DeliveryStatus.SENT),
      receipt(DeliveryStatus.DELIVERED),
      receipt(DeliveryStatus.DELIVERED),
      receipt(DeliveryStatus.READ),
      receipt(DeliveryStatus.FAILED),
    ];

    const summary = DeliveryTrackingUtil.summarize(receipts);

    expect(summary).toEqual({
      queued: 1,
      sent: 1,
      delivered: 2,
      read: 1,
      failed: 1,
      totalRecipients: 6,
    });
  });

  it('returns all zeros for an empty receipt list', () => {
    expect(DeliveryTrackingUtil.summarize([])).toEqual({
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      totalRecipients: 0,
    });
  });
});
