import { Global, Module } from '@nestjs/common';
import { AppLoggerModule } from './logger/app-logger.module';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PaginationInterceptor } from './interceptors/pagination.interceptor';
import { SerializationInterceptor } from './interceptors/serialization.interceptor';

/**
 * RolesGuard/PermissionsGuard/PaginationInterceptor/
 * SerializationInterceptor are provided here so any future module can
 * inject or apply them via @UseGuards()/@UseInterceptors() on a
 * per-controller basis. They are deliberately NOT registered as
 * global APP_GUARD/APP_INTERCEPTOR providers: RolesGuard and
 * PermissionsGuard are no-ops until a future Auth module populates
 * request.authContext (see current-user.decorator.ts), and applying
 * them globally now would add overhead with no effect.
 */
@Global()
@Module({
  imports: [AppLoggerModule],
  providers: [RolesGuard, PermissionsGuard, PaginationInterceptor, SerializationInterceptor],
  exports: [
    AppLoggerModule,
    RolesGuard,
    PermissionsGuard,
    PaginationInterceptor,
    SerializationInterceptor,
  ],
})
export class CommonModule {}
