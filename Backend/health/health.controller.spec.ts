import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq-health.indicator';
import { DatabaseHealthService } from '../database/services/database-health.service';
import { QueueHealthIndicator } from '../infrastructure/monitoring/queue-health.indicator';
import { StorageHealthIndicator } from '../infrastructure/monitoring/storage-health.indicator';
import { InfrastructureMetricsService } from '../infrastructure/monitoring/infrastructure-metrics.service';
import { PerformanceMonitoringService } from '../infrastructure/monitoring/performance-monitoring.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockCheckResult = {
    status: 'ok',
    info: {},
    error: {},
    details: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: { check: jest.fn().mockResolvedValue(mockCheckResult) },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn(), checkRSS: jest.fn() },
        },
        {
          provide: DiskHealthIndicator,
          useValue: { checkStorage: jest.fn() },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: { check: jest.fn() },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { check: jest.fn() },
        },
        {
          provide: RabbitMQHealthIndicator,
          useValue: { check: jest.fn() },
        },
        {
          provide: DatabaseHealthService,
          useValue: { getSnapshot: jest.fn().mockReturnValue({}) },
        },
        {
          provide: QueueHealthIndicator,
          useValue: { check: jest.fn() },
        },
        {
          provide: StorageHealthIndicator,
          useValue: { check: jest.fn() },
        },
        {
          provide: InfrastructureMetricsService,
          useValue: { getSnapshot: jest.fn().mockReturnValue({}) },
        },
        {
          provide: PerformanceMonitoringService,
          useValue: { getSnapshot: jest.fn().mockReturnValue({}) },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('checkLiveness should invoke HealthCheckService.check', async () => {
    const result = await controller.checkLiveness();
    expect(healthCheckService.check).toHaveBeenCalled();
    expect(result).toEqual(mockCheckResult);
  });

  it('checkReadiness should invoke HealthCheckService.check', async () => {
    const result = await controller.checkReadiness();
    expect(healthCheckService.check).toHaveBeenCalled();
    expect(result).toEqual(mockCheckResult);
  });
});
