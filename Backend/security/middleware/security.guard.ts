import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SKIP_SECURITY_KEY } from '../decorators/security.decorators';
import { SECURITY_CONSTANTS } from '../constants/security.constants';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipSecurity = this.reflector.getAllAndOverride<boolean>(SKIP_SECURITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipSecurity) return true;

    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const contentLength = parseInt(request.headers['content-length'] ?? '0', 10);

    if (contentLength > SECURITY_CONSTANTS.MAX_PAYLOAD_BYTES) {
      return false;
    }

    return true;
  }
}
