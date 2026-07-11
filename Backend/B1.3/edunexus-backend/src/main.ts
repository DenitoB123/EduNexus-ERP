import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppLoggerService } from './common/logger/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);
  const reflector = app.get(Reflector);

  // ── Use custom logger globally ───────────────────────────────────────────
  app.useLogger(logger);

  // ── Global API prefix ────────────────────────────────────────────────────
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  app.setGlobalPrefix(apiPrefix);

  // ── URI versioning (e.g. /api/v1/...) ───────────────────────────────────
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('app.apiVersion', 'v1'),
  });

  // ── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigins = configService
    .get<string>('app.corsOrigins', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  const corsMethods = configService.get<string>(
    'app.corsMethods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  );

  app.enableCors({
    origin: corsOrigins,
    methods: corsMethods,
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 86400,
  });

  // ── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
    }),
  );

  // ── Global exception filters (order: specific → catch-all) ──────────────
  app.useGlobalFilters(new AllExceptionsFilter(logger), new HttpExceptionFilter(logger));

  // ── Global interceptors ──────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new TransformInterceptor(reflector),
    new ClassSerializerInterceptor(reflector),
  );

  // ── Graceful shutdown hooks ──────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Listen ───────────────────────────────────────────────────────────────
  const port = configService.get<number>('app.port', 3000);
  const host = configService.get<string>('app.host', '0.0.0.0');

  await app.listen(port, host);

  logger.log(
    `🚀 EduNexus API running → http://${host}:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  logger.log(
    `📘 Environment: ${configService.get<string>('app.env', 'development')}`,
    'Bootstrap',
  );
}

bootstrap().catch((error: Error) => {
  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
