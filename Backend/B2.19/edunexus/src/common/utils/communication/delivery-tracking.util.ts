import { MessageDeliveryReceiptEntity } from '../../messaging/entities/message-delivery-receipt.entity';
import { DeliveryStatus } from '../../messaging/enums/delivery-status.enum';
import { DeliveryStatsSummary } from '../../interfaces/communication/message-delivery-service.interface';

export class DeliveryTrackingUtil {
  static summarize(receipts: MessageDeliveryReceiptEntity[]): DeliveryStatsSummary {
    const summary: DeliveryStatsSummary = {
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      totalRecipients: receipts.length,
    };

    for (const receipt of receipts) {
      switch (receipt.status) {
        case DeliveryStatus.QUEUED:
          summary.queued += 1;
          break;
        case DeliveryStatus.SENT:
          summary.sent += 1;
          break;
        case DeliveryStatus.DELIVERED:
          summary.delivered += 1;
          break;
        case DeliveryStatus.READ:
          summary.read += 1;
          break;
        case DeliveryStatus.FAILED:
          summary.failed += 1;
          break;
      }
    }

    return summary;
  }
}
