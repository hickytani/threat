import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service.js';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtServiceMock: any;
  let prismaMock: any;

  beforeEach(() => {
    jwtServiceMock = {
      verifyAsync: jest.fn(),
    };
    prismaMock = {
      session: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    guard = new JwtAuthGuard(
      jwtServiceMock as unknown as JwtService,
      prismaMock as unknown as PrismaService,
    );
  });

  it('should throw UnauthorizedException if no token is extracted', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should throw UnauthorizedException if token is invalid or expired', async () => {
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer invalid-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      new UnauthorizedException('Authentication token is invalid or expired'),
    );
  });

  it('should throw UnauthorizedException if session is revoked', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user_1', sessionId: 'sess_1' });
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'sess_1',
      revoked: true,
      expiresAt: new Date(Date.now() + 10000),
      user: { id: 'user_1', email: 'test@example.com', fullName: 'John Doe', isActive: true },
    });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      new UnauthorizedException('This session has been revoked'),
    );
  });

  it('should throw UnauthorizedException if user account is inactive', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user_1', sessionId: 'sess_1' });
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'sess_1',
      revoked: false,
      expiresAt: new Date(Date.now() + 10000),
      user: { id: 'user_1', email: 'test@example.com', fullName: 'John Doe', isActive: false }, // Inactive!
    });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      new UnauthorizedException('User account is suspended or inactive'),
    );
  });
});
