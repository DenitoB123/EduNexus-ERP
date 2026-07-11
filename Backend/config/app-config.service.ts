import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';
import { RedisConfig } from './redis.config';
import { RabbitMQConfig } from './rabbitmq.config';
import { JwtConfig } from './jwt.config';
import { LoggingConfig } from './logging.config';
import { CacheConfig } from '../infrastructure/config/cache.config';
import { QueueInfraConfig } from '../infrastructure/config/queue.config';
import { SchedulerInfraConfig } from '../infrastructure/config/scheduler.config';
import { StorageConfig } from '../infrastructure/config/storage.config';
import { EmailConfig } from '../infrastructure/config/email.config';
import { SmsConfig } from '../infrastructure/config/sms.config';
import { PushConfig } from '../infrastructure/config/push.config';
import { SecurityConfig } from '../security/config/security.config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get app(): AppConfig {
    return this.configService.get<AppConfig>('app') as AppConfig;
  }

  get database(): DatabaseConfig {
    return this.configService.get<DatabaseConfig>('database') as DatabaseConfig;
  }

  get redis(): RedisConfig {
    return this.configService.get<RedisConfig>('redis') as RedisConfig;
  }

  get rabbitmq(): RabbitMQConfig {
    return this.configService.get<RabbitMQConfig>('rabbitmq') as RabbitMQConfig;
  }

  get jwt(): JwtConfig {
    return this.configService.get<JwtConfig>('jwt') as JwtConfig;
  }

  get logging(): LoggingConfig {
    return this.configService.get<LoggingConfig>('logging') as LoggingConfig;
  }

  get cache(): CacheConfig {
    return this.configService.get<CacheConfig>('cache') as CacheConfig;
  }

  get queue(): QueueInfraConfig {
    return this.configService.get<QueueInfraConfig>('queue') as QueueInfraConfig;
  }

  get scheduler(): SchedulerInfraConfig {
    return this.configService.get<SchedulerInfraConfig>('scheduler') as SchedulerInfraConfig;
  }

  get storage(): StorageConfig {
    return this.configService.get<StorageConfig>('storage') as StorageConfig;
  }

  get email(): EmailConfig {
    return this.configService.get<EmailConfig>('email') as EmailConfig;
  }

  get sms(): SmsConfig {
    return this.configService.get<SmsConfig>('sms') as SmsConfig;
  }

  get push(): PushConfig {
    return this.configService.get<PushConfig>('push') as PushConfig;
  }

  get security(): SecurityConfig {
    return this.configService.get<SecurityConfig>('security') as SecurityConfig;
  }

  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.app.nodeEnv === 'test';
  }
}
