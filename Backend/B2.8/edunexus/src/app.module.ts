import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { CommonModule } from './common/common.module';
import { AppLoggerModule } from './common/logger/app-logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { DatabaseModule } from './database/database.module';
import { TenantIsolationMiddleware } from './database/context/tenant-isolation.middleware';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RabbitMQModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { EventModule } from './infrastructure/events/event.module';
import { CqrsModule } from './common/cqrs/cqrs.module';
import { JobModule } from './infrastructure/jobs/job.module';
import { SchedulerModule } from './infrastructure/scheduler/scheduler.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { EmailModule } from './infrastructure/email/email.module';
import { SmsModule } from './infrastructure/sms/sms.module';
import { PushModule } from './infrastructure/push/push.module';
import { InfrastructureMonitoringModule } from './infrastructure/monitoring/infrastructure-monitoring.module';
import { RequestContextMiddleware } from './infrastructure/monitoring/request-context.middleware';
import { PerformanceMonitoringInterceptor } from './infrastructure/monitoring/performance-monitoring.interceptor';
import { SecurityModule } from './security/security.module';
import { RequestIdMiddleware } from './security/middleware/request-id.middleware';
import { SecurityInterceptor } from './security/middleware/security.interceptor';
import { SecurityGuard } from './security/middleware/security.guard';
import { ApiModule } from './api/api.module';
import { ApiMetadataMiddleware } from './api/middleware/api-metadata.middleware';
import { RequestTimingMiddleware } from './api/middleware/request-timing.middleware';
import { ApiMetricsInterceptor } from './api/monitoring/api-metrics.interceptor';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    CommonModule,
    JwtModule.registerAsync({
      global: true,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: { expiresIn: configService.jwt.expiresIn },
      }),
    }),
    PrismaModule,
    DatabaseModule,
    RedisModule,
    RabbitMQModule,
    CacheModule,
    EventModule,
    CqrsModule,
    JobModule,
    SchedulerModule,
    StorageModule,
    EmailModule,
    SmsModule,
    PushModule,
    InfrastructureMonitoringModule,
    SecurityModule,
    ApiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    // Filters run in reverse registration order (last in = outermost),
    // so the catch-all is registered first and specific filters after.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Interceptors run in registration order (first in = outermost).
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SecurityInterceptor },
    { provide: APP_INTERCEPTOR, useClass: PerformanceMonitoringInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiMetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Guards
    { provide: APP_GUARD, useClass: SecurityGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        RequestIdMiddleware,
        RequestContextMiddleware,
        TenantIsolationMiddleware,
        ApiMetadataMiddleware,
        RequestTimingMiddleware,
      )
      .forRoutes('*');
  }
}
