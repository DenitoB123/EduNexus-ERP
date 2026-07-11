import { Injectable } from '@nestjs/common';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

@Injectable()
export class StorageHealthChecker implements IHealthChecker {
  readonly name = 'storage';
  readonly categories: HealthCheckCategory[] = ['readiness', 'dependency'];

  constructor(private readonly storageService: StorageService) {}

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      await this.storageService.getProvider().exists('__observability_health_probe__');
      return { state: 'up' };
    });
  }
}
