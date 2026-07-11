import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { TenancyMiddleware } from './tenancy.middleware';

@Module({
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply to all routes except the health-check (HealthModule, 1.3)
    consumer
      .apply(TenancyMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
