import { TenantGuard } from './tenant.guard.js';
import { RolesGuard } from './roles.guard.js';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('Tenant Isolation & RBAC Security Attack Matrix', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  function createMockContext(user: any, member: any): ExecutionContext {
    const req = {
      user,
      member,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  describe('Tenant Isolation Guard', () => {
    it('allows access when user and member context are fully authenticated', async () => {
      const guard = new TenantGuard();
      const ctx = createMockContext(
        { id: 'user-1', email: 'user@tenant-a.com' },
        { id: 'mem-1', organizationId: 'org-tenant-a', role: 'SECURITY_ANALYST' },
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('blocks access when user is not authenticated', async () => {
      const guard = new TenantGuard();
      const ctx = createMockContext(null, null);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('blocks access when member organizationId is missing', async () => {
      const guard = new TenantGuard();
      const ctx = createMockContext({ id: 'user-1' }, { id: 'mem-1' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('RBAC Privilege Escalation Guard', () => {
    it('blocks ANALYST user from performing ADMIN-only actions', () => {
      const guard = new RolesGuard(reflector);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'OWNER']);

      const ctx = createMockContext(
        { id: 'user-2' },
        { id: 'mem-2', organizationId: 'org-1', role: 'SECURITY_ANALYST' },
      );

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows ADMIN user to perform ADMIN-only actions', () => {
      const guard = new RolesGuard(reflector);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'OWNER']);

      const ctx = createMockContext(
        { id: 'user-3' },
        { id: 'mem-3', organizationId: 'org-1', role: 'ADMIN' },
      );

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('blocks payload-injected role escalation', () => {
      const guard = new RolesGuard(reflector);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      // Client attempts to pass role='ADMIN' in body while session membership role is 'VIEWER'
      const ctx = createMockContext(
        { id: 'user-4' },
        { id: 'mem-4', organizationId: 'org-1', role: 'VIEWER' },
      );
      (ctx.switchToHttp().getRequest() as any).body = { role: 'ADMIN' };

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
