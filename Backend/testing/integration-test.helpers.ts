import { ModuleMetadata, TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnitTestHelpers } from './unit-test.helpers';
import { AppLoggerService } from '../logger/app-logger.service';
import { AppConfigService } from '../../config/app-config.service';
import { TenantContextService } from '../../database/context/tenant-context.service';

export class IntegrationTestHelpers {
  static async createTestModule(metadata: ModuleMetadata): Promise<TestingModule> {
    return Test.createTestingModule({
      ...metadata,
      providers: [
        ...(metadata.providers ?? []),
        {
          provide: AppLoggerService,
          useValue: UnitTestHelpers.createLoggerMock(),
        },
        {
          provide: AppConfigService,
          useValue: UnitTestHelpers.createConfigMock(),
        },
        {
          provide: TenantContextService,
          useValue: UnitTestHelpers.createTenantContextMock(),
        },
      ],
    }).compile();
  }

  static async compileAndInit(metadata: ModuleMetadata): Promise<TestingModule> {
    const module = await this.createTestModule(metadata);
    await module.init();
    return module;
  }
}
