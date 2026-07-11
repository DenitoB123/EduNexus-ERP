/**
 * queue-dashboard-metadata.service.ts
 *
 * B2.9 — Enterprise Asynchronous Processing Framework
 *
 * Descriptive metadata (display name, description, owning domain) about
 * every registered queue, for a future admin-UI queue dashboard (e.g. a
 * Bull-Board-style view, or a custom EduNexus admin screen) to render
 * without hardcoding queue names. Deliberately separate from
 * QueueRegistryService (which only tracks *names*, needed by the engine
 * itself) — this is presentation metadata, optional per queue.
 */

import { Injectable } from '@nestjs/common';

export interface IQueueDashboardMetadata {
  queueName: string;
  displayName: string;
  description?: string;
  domain: string;
  jobTypes: string[];
}

@Injectable()
export class QueueDashboardMetadataService {
  private readonly metadata = new Map<string, IQueueDashboardMetadata>();

  register(metadata: IQueueDashboardMetadata): void {
    this.metadata.set(metadata.queueName, metadata);
  }

  get(queueName: string): IQueueDashboardMetadata | undefined {
    return this.metadata.get(queueName);
  }

  listByDomain(domain?: string): IQueueDashboardMetadata[] {
    const all = [...this.metadata.values()];
    return domain ? all.filter((m) => m.domain === domain) : all;
  }
}
