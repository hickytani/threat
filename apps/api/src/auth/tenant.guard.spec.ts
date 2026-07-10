import { TenantGuard } from './tenant.guard.js';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('should throw UnauthorizedException if req.user or req.member is undefined', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: undefined,
          member: undefined,
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw ForbiddenException if organization ID is missing in member context', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'usr_1', email: 'test@example.com' },
          member: {
            id: 'memb_1',
            userId: 'usr_1',
            organizationId: undefined, // Missing!
          },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow access if active organizationId is present in resolved member session context', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'usr_1', email: 'test@example.com' },
          member: {
            id: 'memb_1',
            userId: 'usr_1',
            organizationId: 'org_1',
            role: 'SECURITY_ANALYST',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
