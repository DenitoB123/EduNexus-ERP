import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppConfigService } from './config/app-config.service';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly configService: AppConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Service identification endpoint' })
  getRoot(): { name: string; environment: string; version: string } {
    return {
      name: this.configService.app.name,
      environment: this.configService.app.nodeEnv,
      version: this.configService.app.defaultApiVersion,
    };
  }
}
