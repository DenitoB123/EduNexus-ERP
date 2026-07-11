import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { RabbitMQService } from '../src/infrastructure/rabbitmq/rabbitmq.service';
import { StorageService } from '../src/infrastructure/storage/storage.service';
import { createValidationPipeOptions } from '../src/common/pipes/validation.pipe';

describe('Application Bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        enableShutdownHooks: jest.fn(),
        isHealthy: jest.fn().mockResolvedValue(true),
      })
      .overrideProvider(RedisService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        isHealthy: jest.fn().mockResolvedValue(true),
      })
      .overrideProvider(RabbitMQService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        isHealthy: jest.fn().mockReturnValue(true),
        getChannelWrapper: jest.fn().mockReturnValue({
          addSetup: jest.fn().mockImplementation(async (setupFn: (channel: unknown) => Promise<void>) =>
            setupFn({
              assertExchange: jest.fn().mockResolvedValue(undefined),
              assertQueue: jest.fn().mockResolvedValue(undefined),
              bindQueue: jest.fn().mockResolvedValue(undefined),
              prefetch: jest.fn().mockResolvedValue(undefined),
              consume: jest.fn().mockResolvedValue(undefined),
              publish: jest.fn().mockResolvedValue(undefined),
              ack: jest.fn(),
              nack: jest.fn(),
              get: jest.fn().mockResolvedValue(false),
            }),
          ),
          publish: jest.fn().mockResolvedValue(undefined),
          sendToQueue: jest.fn().mockResolvedValue(undefined),
        }),
      })
      .overrideProvider(StorageService)
      .useValue({
        onModuleInit: jest.fn(),
        getProvider: jest.fn().mockReturnValue({
          exists: jest.fn().mockResolvedValue(false),
          upload: jest.fn(),
          download: jest.fn(),
          delete: jest.fn(),
          getMetadata: jest.fn(),
          getSignedUrl: jest.fn(),
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe(createValidationPipeOptions()));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should boot the application successfully', () => {
    expect(app).toBeDefined();
  });

  it('GET /api (root) should return service identification', async () => {
    const response = await request(app.getHttpServer()).get('/api').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('environment');
  });

  it('GET /api/health/live should return liveness status', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/live').expect(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('GET /api/health/ready should return readiness status with all dependencies up', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/ready').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.details.database.status).toBe('up');
    expect(response.body.data.details.redis.status).toBe('up');
    expect(response.body.data.details.rabbitmq.status).toBe('up');
  });

  it('should return 401 for protected routes without a token', async () => {
    await request(app.getHttpServer()).get('/api/nonexistent-protected-route').expect(401);
  });
});
