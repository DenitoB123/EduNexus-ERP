import { Injectable } from '@nestjs/common';

export interface QueueMonitoringSnapshot {
  enqueued: number;
  processed: number;
  failed: number;
  retried: number;
}

@Injectable()
export class QueueMonitoringService {
  private enqueued = 0;
  private processed = 0;
  private failed = 0;
  private retried = 0;

  recordEnqueued(): void {
    this.enqueued += 1;
  }

  recordProcessed(): void {
    this.processed += 1;
  }

  recordFailed(): void {
    this.failed += 1;
  }

  recordRetried(): void {
    this.retried += 1;
  }

  getSnapshot(): QueueMonitoringSnapshot {
    return {
      enqueued: this.enqueued,
      processed: this.processed,
      failed: this.failed,
      retried: this.retried,
    };
  }
}
