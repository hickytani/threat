import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { ExternalThreatIntelProvider, LocalThreatIntelProvider } from './threat-intel.provider.js';

@Injectable({ scope: Scope.REQUEST })
export class IntelligenceService extends TenantScopedRepository {
  private readonly localProvider: LocalThreatIntelProvider;
  private readonly externalProvider: ExternalThreatIntelProvider;

  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
    this.localProvider = new LocalThreatIntelProvider(prisma);
    this.externalProvider = new ExternalThreatIntelProvider();
  }

  async getIocs() {
    return this.prisma.iOC.findMany({
      where: { organizationId: this.organizationId },
      orderBy: { lastObserved: 'desc' },
    });
  }

  async investigate(value: string, type: string) {
    const localResult = await this.localProvider.investigate(this.organizationId, value, type);

    return {
      organizationId: this.organizationId,
      value,
      type,
      ...localResult,
      external: await this.externalProvider.investigate(value, type),
    };
  }
}
