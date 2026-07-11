import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { AppConfigService } from '../../config/app-config.service';

export interface QueryPerformanceEvent {
  query: string;
  params: string;
  durationMs: number;
}

@Injectable()
export class QueryPerformanceLogger {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly configService: AppConfigService,
  ) {
    this.logger.setContext('QueryPerformanceLogger');
  }

  record(event: QueryPerformanceEvent): void {
    const threshold = this.configService.database.slowQueryThresholdMs;

    if (event.durationMs >= threshold) {
      this.logger.warn(
        `Slow query detected (${event.durationMs}ms >= ${threshold}ms): ${event.query} | params=${event.params}`,
      );
      return;
    }

    if (this.configService.database.logging) {
      this.logger.debug(`Query (${event.durationMs}ms): ${event.query} | params=${event.params}`);
    }
  }
}
