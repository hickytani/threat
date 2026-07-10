import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class AuditService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async findAll() {
    return this.prisma.auditLog.findMany({
      where: { organizationId: this.organizationId },
      orderBy: { timestamp: 'desc' },
      take: 100, // Limit to last 100 entries for density
    });
  }
}
