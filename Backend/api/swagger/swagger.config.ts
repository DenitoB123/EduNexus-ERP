import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

export class SwaggerConfig {
  static setup(app: INestApplication, configService: AppConfigService): void {
    const { name, globalPrefix } = configService.app;

    const document: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(`${name} API`)
        .setDescription(
          `${name} Enterprise Backend — Full API Reference.\n\n` +
          `**Authentication**: All endpoints (except public health endpoints) require a Bearer JWT token.\n\n` +
          `**Tenant Scoping**: Every request is scoped to a tenant by the \`x-tenant-id\` header.\n\n` +
          `**Versioning**: URI versioning — all routes are prefixed with \`/v{N}\`.`,
        )
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
        .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api-key')
        .addGlobalParameters(
          { in: 'header', name: 'x-tenant-id', schema: { type: 'string' }, required: false },
          { in: 'header', name: 'x-correlation-id', schema: { type: 'string' }, required: false },
          { in: 'header', name: 'x-request-id', schema: { type: 'string' }, required: false },
        )
        .build(),
    );

    SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    });
  }
}
