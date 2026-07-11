import { Injectable, Logger } from '@nestjs/common';
import { IAnalyticsDatasetProvider } from '../interfaces/dataset-provider.interface';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';

/**
 * Holds every IAnalyticsDatasetProvider registered by feature modules.
 * This is the reusable "analytics dataset" surface required by B2.12:
 * any future module (attendance, billing, exams, ...) can register a
 * dataset here and it immediately becomes usable by ReportDefinitions
 * and, later, dashboards — without reporting module changes.
 *
 * Registration happens by injecting DatasetRegistry into a feature
 * module's provider and calling `register()` from `onModuleInit()`.
 */
@Injectable()
export class DatasetRegistry {
  private readonly logger = new Logger(DatasetRegistry.name);
  private readonly providers = new Map<string, IAnalyticsDatasetProvider>();

  register(provider: IAnalyticsDatasetProvider): void {
    if (this.providers.has(provider.key)) {
      this.logger.warn(`Dataset provider "${provider.key}" is already registered; overwriting`);
    }
    this.providers.set(provider.key, provider);
    this.logger.log(`Registered analytics dataset provider "${provider.key}"`);
  }

  get(key: string): IAnalyticsDatasetProvider {
    const provider = this.providers.get(key);
    if (!provider) {
      throw new ResourceNotFoundException('AnalyticsDataset', key);
    }
    return provider;
  }

  has(key: string): boolean {
    return this.providers.has(key);
  }

  list(): IAnalyticsDatasetProvider[] {
    return Array.from(this.providers.values());
  }
}
