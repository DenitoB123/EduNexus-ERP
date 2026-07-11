import { Global, Module } from '@nestjs/common';
import { ApiMetadataMiddleware } from './middleware/api-metadata.middleware';
import { RequestTimingMiddleware } from './middleware/request-timing.middleware';
import { ApiMetricsService } from './monitoring/api-metrics.service';
import { ApiMetricsInterceptor } from './monitoring/api-metrics.interceptor';

@Global()
@Module({
  providers: [
    ApiMetadataMiddleware,
    RequestTimingMiddleware,
    ApiMetricsService,
    ApiMetricsInterceptor,
  ],
  exports: [ApiMetadataMiddleware, RequestTimingMiddleware, ApiMetricsService, ApiMetricsInterceptor],
})
export class ApiModule {}
