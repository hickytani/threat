import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { ExternalThreatIntelProvider, LocalThreatIntelProvider } from './threat-intel.provider.js';
import { buildDeterministicTimeline } from '../common/timeline.util.js';
import type { Prisma } from '@prisma/client';

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
      take: 100,
    });
  }

  async getIocDetail(idOrValue: string) {
    let ioc = await this.prisma.iOC.findFirst({
      where: {
        organizationId: this.organizationId,
        id: idOrValue,
      },
      include: {
        enrichments: true,
      },
    });

    if (!ioc) {
      ioc = await this.prisma.iOC.findFirst({
        where: {
          organizationId: this.organizationId,
          value: idOrValue,
        },
        include: {
          enrichments: true,
        },
      });
    }

    if (!ioc) {
      throw new NotFoundException(`IOC with ID or Value '${idOrValue}' not found`);
    }

    const val = ioc.value;

    // 1. Observations (Events)
    const observations = await this.prisma.securityEvent.findMany({
      where: {
        organizationId: this.organizationId,
        OR: [
          { sourceIp: val },
          { destinationIp: val },
          { rawJson: { contains: val, mode: 'insensitive' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // 2. Alerts
    const alerts = await this.prisma.alert.findMany({
      where: {
        organizationId: this.organizationId,
        OR: [
          { ipAddress: val },
          { domain: val },
          { fileHash: val },
          { title: { contains: val, mode: 'insensitive' } },
          { description: { contains: val, mode: 'insensitive' } },
        ],
      },
      include: {
        asset: true,
        incident: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // 3. Incidents
    const incidentMap = new Map();
    for (const alert of alerts) {
      if (alert.incident && !incidentMap.has(alert.incident.id)) {
        incidentMap.set(alert.incident.id, alert.incident);
      }
    }
    const incidents = Array.from(incidentMap.values());

    // 4. Affected Assets
    const assetMap = new Map();
    for (const alert of alerts) {
      if (alert.asset && !assetMap.has(alert.asset.id)) {
        assetMap.set(alert.asset.id, alert.asset);
      }
    }
    const affectedAssets = Array.from(assetMap.values());

    // 5. Intelligence Result
    const intelResult = await this.investigate(val, ioc.type);

    // 6. Timeline
    const timeline = buildDeterministicTimeline({
      securityEvents: observations,
      alerts,
      iocEnrichments: ioc.enrichments,
    });

    return {
      ...ioc,
      observations,
      alerts,
      incidents,
      affectedAssets,
      enrichments: ioc.enrichments,
      intelligenceResult: intelResult,
      timeline,
    };
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
