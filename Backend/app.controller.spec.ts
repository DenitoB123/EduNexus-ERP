import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppConfigService } from './config/app-config.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppConfigService,
          useValue: {
            app: {
              name: 'EduNexus',
              nodeEnv: 'test',
              defaultApiVersion: '1',
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return service identification', () => {
    expect(controller.getRoot()).toEqual({
      name: 'EduNexus',
      environment: 'test',
      version: '1',
    });
  });
});
