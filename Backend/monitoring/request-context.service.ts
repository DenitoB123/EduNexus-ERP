import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  correlationId: string;
  method: string;
  url: string;
  startTime: number;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run<T>(context: RequestContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  getElapsedMs(): number | undefined {
    const context = this.storage.getStore();
    return context ? Date.now() - context.startTime : undefined;
  }
}
