import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { AppLoggerService } from './common/logger/app-logger.service';
import { PrismaService } from './prisma/prisma.service';
import { HttpSecurityHelper } from './security/helpers/http-security.helper';
import { createGlobalValidationPipe } from './common/pipes/validation.pipe';
import { SwaggerConfig } from './api/swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(AppConfigService);
  const logger = await app.resolve(AppLoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  const { port, globalPrefix, defaultApiVersion, shutdownTimeoutMs, name, nodeEnv } =
    configService.app;

  app.setGlobalPrefix(globalPrefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: defaultApiVersion,
  });

  app.useGlobalPipes(createGlobalValidationPipe());

  const helmetOptions = HttpSecurityHelper.buildHelmetOptions(configService.security);
  app.use(helmet(nodeEnv === 'production' ? helmetOptions : { contentSecurityPolicy: false }));

  app.use(compression());

  app.enableCors(HttpSecurityHelper.buildCorsOptions(configService.security));

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  SwaggerConfig.setup(app, configService);

  registerGracefulShutdown(app, logger, shutdownTimeoutMs);

  await app.listen(port);

  logger.log(`${name} is running on port ${port} in ${nodeEnv} mode`);
  logger.log(`API available at: http://localhost:${port}/${globalPrefix}/v${defaultApiVersion}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/${globalPrefix}/docs`);
}

function registerGracefulShutdown(
  app: NestExpressApplication,
  logger: AppLoggerService,
  timeoutMs: number,
): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, () => {
      logger.warn(`Received ${signal}, starting graceful shutdown...`);

      const forceExitTimer = setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, timeoutMs);

      app
        .close()
        .then(() => {
          clearTimeout(forceExitTimer);
          logger.log('Application shut down gracefully');
          process.exit(0);
        })
        .catch((error: Error) => {
          clearTimeout(forceExitTimer);
          logger.error(`Error during graceful shutdown: ${error.message}`, error.stack);
          process.exit(1);
        });
    });
  });
}

bootstrap().catch((error: Error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during application bootstrap:', error);
  process.exit(1);
});
