import { Injectable } from '@nestjs/common';
import { IJobHandler } from '../interfaces/job.interface';

@Injectable()
export class JobRegistry {
  private readonly handlers = new Map<string, IJobHandler>();

  register(handler: IJobHandler): void {
    this.handlers.set(handler.name, handler);
  }

  get(name: string): IJobHandler | undefined {
    return this.handlers.get(name);
  }

  list(): IJobHandler[] {
    return Array.from(this.handlers.values());
  }
}
