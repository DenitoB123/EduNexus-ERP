import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { REQUIRED_ROLES_KEY, REQUIRED_PERMISSIONS_KEY } from '../decorators/require-access.decorator';

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when no roles are required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('allows the request through when no authContext exists yet (pre-Auth-module state)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SCHOOL_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('allows the request when authContext has a matching role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SCHOOL_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const request = { authContext: { userId: 'u1', roles: ['SCHOOL_ADMIN'], permissions: [] } };
    expect(guard.canActivate(makeContext(request))).toBe(true);
  });

  it('throws AuthorizationException when authContext lacks the required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SCHOOL_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const request = { authContext: { userId: 'u1', roles: ['STUDENT'], permissions: [] } };
    expect(() => guard.canActivate(makeContext(request))).toThrow();
  });
});

describe('PermissionsGuard', () => {
  it('allows the request through when no authContext exists yet', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['students:delete']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('throws when authContext is missing a required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['students:delete']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const request = { authContext: { userId: 'u1', roles: [], permissions: ['students:read'] } };
    expect(() => guard.canActivate(makeContext(request))).toThrow();
  });
});
