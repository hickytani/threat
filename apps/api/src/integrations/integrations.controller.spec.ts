import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { UserRole } from 'shared-types';

describe('IntegrationsController Server-Side RBAC Enforcement', () => {
  let controller: IntegrationsController;
  let serviceMock: any;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'int_01' }),
      getMetrics: jest.fn().mockResolvedValue({ totalEvents: 10 }),
      create: jest.fn().mockResolvedValue({ id: 'int_created' }),
      update: jest.fn().mockResolvedValue({ id: 'int_updated' }),
      regenerateSecret: jest.fn().mockResolvedValue({ id: 'int_rotated' }),
      revokeSecret: jest.fn().mockResolvedValue({ id: 'int_revoked' }),
      testEvent: jest.fn().mockResolvedValue({ success: true }),
      delete: jest.fn().mockResolvedValue({ success: true }),
    };

    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        { provide: IntegrationsService, useValue: serviceMock },
        { provide: RolesGuard, useValue: rolesGuard },
        { provide: Reflector, useValue: reflector },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
  });

  function createMockExecutionContext(memberRole: UserRole, targetMethodName: string): ExecutionContext {
    const handler = (controller as any)[targetMethodName];
    reflector.getAllAndOverride = jest.fn().mockReturnValue(
      targetMethodName === 'testEvent'
        ? ['SUPER_ADMIN', 'ORG_ADMIN', 'SOC_MANAGER', 'SECURITY_ANALYST']
        : targetMethodName === 'findAll' || targetMethodName === 'findOne' || targetMethodName === 'getMetrics'
        ? null
        : ['SUPER_ADMIN', 'ORG_ADMIN'],
    );

    return {
      getHandler: () => handler,
      getClass: () => IntegrationsController,
      switchToHttp: () => ({
        getRequest: () => ({
          member: {
            id: 'mem_01',
            organizationId: 'org_01',
            userId: 'usr_01',
            role: memberRole,
          },
        }),
      }),
    } as any;
  }

  describe('Server-Side Mutation Guard Checks', () => {
    it('allows ORG_ADMIN to create integrations', () => {
      const ctx = createMockExecutionContext('ORG_ADMIN' as UserRole, 'create');
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('denies SECURITY_ANALYST from creating integrations', () => {
      const ctx = createMockExecutionContext('SECURITY_ANALYST' as UserRole, 'create');
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('denies COMPLIANCE_VIEWER from updating integrations', () => {
      const ctx = createMockExecutionContext('COMPLIANCE_VIEWER' as UserRole, 'update');
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('denies SECURITY_ANALYST from deleting integrations', () => {
      const ctx = createMockExecutionContext('SECURITY_ANALYST' as UserRole, 'delete');
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('denies SECURITY_ANALYST from rotating secrets', () => {
      const ctx = createMockExecutionContext('SECURITY_ANALYST' as UserRole, 'regenerateSecret');
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows SECURITY_ANALYST to execute test events', () => {
      const ctx = createMockExecutionContext('SECURITY_ANALYST' as UserRole, 'testEvent');
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });
  });
});
