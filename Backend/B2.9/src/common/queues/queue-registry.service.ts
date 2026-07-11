/**
 * queue-registry.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Tracks every queue name this framework has created (via QueueNamingUtil)
 * so the monitoring/admin surface can enumerate "all queues" without
 * requiring a caller to already know every name up front — BullMQ itself
 * has no built-in "list all queues" API.
 */

import { Injectable } from '@nestjs/common';
import { QueueNamingUtil } from '../utils/background/queue-naming.util';

@Injectable()
export class QueueRegistryService {
  private readonly queues = new Map<string, { domain: string; name: string; registeredAt: Date }>();

  register(domain: string, name: string): string {
    const queueName = QueueNamingUtil.build(domain, name);
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, { domain, name, registeredAt: new Date() });
    }
    return queueName;
  }

  list(): string[] {
    return [...this.queues.keys()];
  }

  isRegistered(queueName: string): boolean {
    return this.queues.has(queueName);
  }
}
