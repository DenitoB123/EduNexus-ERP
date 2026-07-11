import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class StorageHealthIndicator {
  constructor(
    private readonly storageService: StorageService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.storageService.getProvider().exists('__health_check__');
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Storage provider unreachable';
      return indicator.down({ message });
    }
  }
}
