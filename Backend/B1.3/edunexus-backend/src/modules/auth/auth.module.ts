import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppConfigService } from '../../config/config.service';
import { SecurityModule } from '../security/security.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresIn,
          issuer: 'edunexus',
          audience: 'edunexus-client',
        },
      }),
    }),
    SecurityModule,
    AuditLogModule,
    EventBusModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Register JwtAuthGuard globally — @Public() bypasses it
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
