import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import rabbitmqConfig from './rabbitmq.config';
import jwtConfig from './jwt.config';
import loggingConfig from './logging.config';
import cacheConfig from '../infrastructure/config/cache.config';
import queueConfig from '../infrastructure/config/queue.config';
import schedulerConfig from '../infrastructure/config/scheduler.config';
import storageConfig from '../infrastructure/config/storage.config';
import emailConfig from '../infrastructure/config/email.config';
import smsConfig from '../infrastructure/config/sms.config';
import pushConfig from '../infrastructure/config/push.config';
import securityConfig from '../security/config/security.config';
import { environmentValidationSchema } from './env.validation';
import { AppConfigService } from './app-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        rabbitmqConfig,
        jwtConfig,
        loggingConfig,
        cacheConfig,
        queueConfig,
        schedulerConfig,
        storageConfig,
        emailConfig,
        smsConfig,
        pushConfig,
        securityConfig,
      ],
      validationSchema: environmentValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
