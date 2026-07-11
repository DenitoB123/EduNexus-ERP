import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Foundation-only JWT guard.
 *
 * This guard verifies that a syntactically valid, correctly signed JWT is
 * present on the request. It does NOT look up users, sessions, roles, or
 * permissions — there is no Users/Auth module in Phase 1.1. Attaching the
 * decoded payload to `request.auth` is as far as this guard goes; full
 * authentication/authorization is intentionally deferred to a later phase.
 *
 * Routes are protected by default. Use the `@Public()` decorator to bypass
 * this guard for endpoints that must remain open (e.g. health checks).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.jwt.secret,
      });
      (request as unknown as { auth: unknown }).auth = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
