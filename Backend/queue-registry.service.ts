import { Injectable } from '@nestjs/common';
import { QueueDefinition } from './queue.config';

@Injectable()
export class QueueRegistry {
  private readonly queues = new Map<string, QueueDefinition>();

  register(definition: QueueDefinition): void {
    this.queues.set(definition.name, definition);
  }

  get(name: string): QueueDefinition | undefined {
    return this.queues.get(name);
  }

  list(): QueueDefinition[] {
    return Array.from(this.queues.values());
  }

  has(name: string): boolean {
    return this.queues.has(name);
  }
}
