import { TenantGuard } from './tenant.guard.js';
import { PrismaService } from '../common/prisma.service.js';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      organizationMember: {
        findUnique: jest.fn(),
      },
    };
    guard = new TenantGuard(prismaMock as unknown as PrismaService);
  });

  it('should throw UnauthorizedException if req.user is undefined', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw ForbiddenException if organization ID is missing in request', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'usr_1', email: 'test@example.com' },
          headers: {},
          params: {},
          query: {},
          body: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException if organization member check fails', async () => {
    prismaMock.organizationMember.findUnique.mockResolvedValue(null);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'usr_1', email: 'test@example.com' },
          headers: { 'x-organization-id': 'org_1' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow access and populate req.member if membership check passes', async () => {
    const mockMember = {
      id: 'memb_1',
      organizationId: 'org_1',
      userId: 'usr_1',
      role: 'SECURITY_ANALYST',
      user: { isActive: true },
    };
    prismaMock.organizationMember.findUnique.mockResolvedValue(mockMember);

    const mockRequest = {
      user: { id: 'usr_1', email: 'test@example.com' },
      headers: { 'x-organization-id': 'org_1' },
      member: undefined,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockRequest.member).toEqual({
      id: 'memb_1',
      organizationId: 'org_1',
      userId: 'usr_1',
      role: 'SECURITY_ANALYST',
    });
  });
});
