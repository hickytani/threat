import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IngestionAuthGuard } from './ingestion-auth.guard.js';
import { IngestionCredentialService } from './ingestion-credential.service.js';

describe('IngestionAuthGuard', () => {
  const credentials = new IngestionCredentialService({} as any);

  it('rejects browser or missing bearer credentials', async () => {
    const prisma = { ingestionCredential: { findUnique: jest.fn() } } as any;
    const guard = new IngestionAuthGuard(prisma, credentials);
    const request = { headers: {} } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(prisma.ingestionCredential.findUnique).not.toHaveBeenCalled();
  });

  it('resolves tenant context from a valid machine credential', async () => {
    const token = 'ts_ing_test-token';
    const prisma = {
      ingestionCredential: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cred_1',
          organizationId: 'org_1',
          tokenPrefix: 'ts_ing_test',
          revokedAt: null,
          expiresAt: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const guard = new IngestionAuthGuard(prisma, credentials);
    const request = { headers: { authorization: `Bearer ${token}` } } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.member.organizationId).toBe('org_1');
    expect(request.user.id).toBe('ingestion:cred_1');
    expect(prisma.ingestionCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred_1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it('rejects revoked credentials', async () => {
    const prisma = {
      ingestionCredential: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cred_1',
          organizationId: 'org_1',
          tokenPrefix: 'ts_ing_test',
          revokedAt: new Date(),
          expiresAt: null,
        }),
      },
    } as any;
    const guard = new IngestionAuthGuard(prisma, credentials);
    const request = { headers: { authorization: 'Bearer ts_ing_test-token' } } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
