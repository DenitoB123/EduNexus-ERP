import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../rbac/decorators/roles.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// No @Version() here — TenancyModule's middleware exclusion and main.ts's
// versioning both anticipate an unversioned, unauthenticated /health route
// (see tenancy.module.ts comments and HealthPing in schema.prisma).
// ─────────────────────────────────────────────────────────────────────────────
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return this.healthService.check();
  }

  @Public()
  @Post('ping')
  @HttpCode(HttpStatus.CREATED)
  ping() {
    return this.healthService.ping();
  }
}
