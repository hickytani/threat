import { Injectable } from '@nestjs/common';
import { AlertSeverity, AlertStatus, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const [totalAlerts, criticalHigh, openIncidents, assetRisk, eventsReceived, latestEvent] = await Promise.all([
      this.prisma.alert.count({
        where: {
          organizationId,
          status: { not: AlertStatus.RESOLVED },
        },
      }),
      this.prisma.alert.count({
        where: {
          organizationId,
          status: { not: AlertStatus.RESOLVED },
          severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.HIGH] },
        },
      }),
      this.prisma.incident.count({
        where: {
          organizationId,
          status: { not: IncidentStatus.CLOSED },
        },
      }),
      this.prisma.asset.aggregate({
        where: { organizationId },
        _count: { _all: true },
        _avg: { riskScore: true },
      }),
      this.prisma.securityEvent.count({ where: { organizationId } }),
      this.prisma.securityEvent.findFirst({
        where: { organizationId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    const atRiskAssets = await this.prisma.asset.count({
      where: {
        organizationId,
        riskScore: { gte: 70 },
      },
    });

    return {
      totalAlerts,
      criticalHigh,
      openIncidents,
      monitoredAssets: assetRisk._count._all,
      averageAssetRisk: assetRisk._avg.riskScore ?? 0,
      atRiskAssets,
      eventsReceived,
      lastEventAt: latestEvent?.timestamp ?? null,
    };
  }
}
