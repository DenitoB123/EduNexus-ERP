import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RbacService } from './rbac.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  providers: [
    RbacService,
    // Register RolesGuard globally — applies after JwtAuthGuard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [RbacService],
})
export class RbacModule {}
