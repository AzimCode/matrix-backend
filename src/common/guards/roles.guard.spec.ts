import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ForbiddenAppException } from '../exceptions/app.exception';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request through when the route has no @Roles() metadata', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('denies an authenticated EDITOR from an ADMIN-only route', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext({ role: AdminRole.EDITOR }))).toThrow(ForbiddenAppException);
  });

  it('allows a matching role through', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.ADMIN, AdminRole.EDITOR]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext({ role: AdminRole.EDITOR }))).toBe(true);
  });

  it('denies when there is no authenticated user at all', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenAppException);
  });
});
