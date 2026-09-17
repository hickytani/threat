import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { AssetType, AssetCriticality, Environment, AlertSeverity, Prisma } from '@prisma/client';
import { buildDeterministicTimeline } from '../common/timeline.util.js';
import { LocalThreatIntelProvider } from '../intelligence/threat-intel.provider.js';

@Injectable({ scope: Scope.REQUEST })
export class AssetsService extends TenantScopedRepository {
  private readonly localIntelProvider: LocalThreatIntelProvider;

  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
    this.localIntelProvider = new LocalThreatIntelProvider(prisma);
  }

  async findAll(search?: string, type?: AssetType) {
    const where: Prisma.AssetWhereInput = {
      organizationId: this.organizationId,
    };

    if (search) {
      where.OR = [
        { hostname: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    return this.prisma.asset.findMany({
      where,
      orderBy: { riskScore: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
      include: {
        alerts: {
          include: {
            incident: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        vulnerabilities: {
          include: {
            vulnerability: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // 1. Recent Events
    const recentEvents = await this.prisma.securityEvent.findMany({
      where: {
        organizationId: this.organizationId,
        OR: [
          { assetId: id },
          { sourceIp: asset.ipAddress },
          { destinationIp: asset.ipAddress },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // 2. Calculated Risk Summary
    const riskSummary = this.buildRiskSummary(asset, recentEvents);

    // 3. Incidents linked to asset's alerts
    const incidentMap = new Map();
    for (const alert of asset.alerts) {
      if (alert.incident && !incidentMap.has(alert.incident.id)) {
        incidentMap.set(alert.incident.id, alert.incident);
      }
    }
    const incidents = Array.from(incidentMap.values());

    // 4. Related IOCs
    const iocValues = [asset.ipAddress, asset.hostname].filter(Boolean);
    const hasIocFindMany = Boolean(this.prisma.iOC && typeof this.prisma.iOC.findMany === 'function');
    const relatedIocs = (iocValues.length > 0 && hasIocFindMany)
      ? await this.prisma.iOC.findMany({
          where: {
            organizationId: this.organizationId,
            value: { in: iocValues },
          },
          take: 20,
        })
      : [];

    // 5. Intelligence relationships
    const hasIocFindUnique = Boolean(this.prisma.iOC && typeof this.prisma.iOC.findUnique === 'function');
    const intelligence = (asset.ipAddress && hasIocFindUnique)
      ? await this.localIntelProvider.investigate(this.organizationId, asset.ipAddress, 'IPV4')
      : null;

    // 6. Timeline
    const timeline = buildDeterministicTimeline({
      securityEvents: recentEvents,
      alerts: asset.alerts,
    });

    return {
      ...asset,
      riskSummary,
      recentEvents,
      incidents,
      relatedIocs,
      intelligence,
      timeline,
    };
  }

  async getTimeline(id: string) {
    const assetDetail = await this.findOne(id);
    return assetDetail.timeline;
  }

  private buildRiskSummary(asset: any, recentEvents: any[]) {
    const criticalityMap: Record<string, number> = {
      [AssetCriticality.LOW]: 5,
      [AssetCriticality.MEDIUM]: 12,
      [AssetCriticality.HIGH]: 22,
      [AssetCriticality.CRITICAL]: 30,
    };

    const criticalityScore = criticalityMap[String(asset.businessCriticality)] ?? 12;

    const severityScore = {
      [AlertSeverity.INFORMATIONAL]: 2,
      [AlertSeverity.LOW]: 6,
      [AlertSeverity.MEDIUM]: 10,
      [AlertSeverity.HIGH]: 15,
      [AlertSeverity.CRITICAL]: 24,
    };

    const contributors: Array<{ label: string; score: number; reason: string }> = [
      {
        label: 'criticality',
        score: criticalityScore,
        reason: `Asset criticality is ${asset.businessCriticality}, which contributes ${criticalityScore} risk points.`,
      },
    ];

    let score = criticalityScore;

    const activeAlerts = asset.alerts || [];
    const activeAlertCount = activeAlerts.filter((alert: any) => alert.status !== 'RESOLVED').length;

    if (activeAlertCount > 0) {
      const alertScore = activeAlerts.reduce((total: number, alert: any) => total + (severityScore[alert.severity as AlertSeverity] ?? 0), 0);
      score += alertScore;
      contributors.push({
        label: 'alerts',
        score: alertScore,
        reason: `Detected ${activeAlertCount} active alerts with cumulative severity weighting of ${alertScore}.`,
      });
    }

    const openVulnerabilities = (asset.vulnerabilities || []).filter((entry: any) => entry.status === 'OPEN' || entry.status === 'EXCEPTION');
    if (openVulnerabilities.length > 0) {
      const vulnScore = openVulnerabilities.reduce((total: number, entry: any) => {
        const vulnerability = entry.vulnerability || {};
        const base = Number(vulnerability.cvssScore || 0) * 1.6;
        return total + Math.round(base);
      }, 0);
      score += vulnScore;
      contributors.push({
        label: 'vulnerabilities',
        score: vulnScore,
        reason: `Open vulnerabilities on this asset contribute ${vulnScore} points, including ${openVulnerabilities.map((entry: any) => entry.cveId).join(', ')}.`,
      });
    }

    const relatedIncidents = new Set(activeAlerts.filter((alert: any) => alert.incidentId).map((alert: any) => alert.incidentId));
    if (relatedIncidents.size > 0) {
      const incidentScore = Math.min(20, relatedIncidents.size * 8);
      score += incidentScore;
      contributors.push({
        label: 'incidents',
        score: incidentScore,
        reason: `This asset is associated with ${relatedIncidents.size} incident(s), increasing risk by ${incidentScore} points.`,
      });
    }

    const maliciousIocMatches = activeAlerts.filter((alert: any) => alert.rawEvent?.matchedIoc?.label === 'MALICIOUS').length;
    if (maliciousIocMatches > 0) {
      const intelligenceScore = Math.min(20, maliciousIocMatches * 10);
      score += intelligenceScore;
      contributors.push({
        label: 'intelligence',
        score: intelligenceScore,
        reason: `Malicious IOC matches from alert evidence contribute ${intelligenceScore} points.`,
      });
    }

    const suspiciousEvents = (recentEvents || []).filter((event: any) => event.outcome === 'FAILURE' || event.severity === AlertSeverity.HIGH || event.severity === AlertSeverity.CRITICAL);
    if (suspiciousEvents.length > 0) {
      const eventScore = Math.min(18, suspiciousEvents.length * 5);
      score += eventScore;
      contributors.push({
        label: 'events',
        score: eventScore,
        reason: `${suspiciousEvents.length} recent suspicious security events add ${eventScore} points.`,
      });
    }

    const recencyScore = this.calculateRecencyScore(recentEvents);
    if (recencyScore > 0) {
      score += recencyScore;
      contributors.push({
        label: 'recency',
        score: recencyScore,
        reason: `Recent activity within the last 7 days adds ${recencyScore} points.`,
      });
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    const orderedContributors = [...contributors].sort((a, b) => {
      const labelWeight = { criticality: 0, intelligence: 1, vulnerabilities: 2, incidents: 3, alerts: 4, events: 5, recency: 6 };
      return (labelWeight[a.label as keyof typeof labelWeight] ?? 99) - (labelWeight[b.label as keyof typeof labelWeight] ?? 99);
    });

    return {
      score: finalScore,
      contributors: orderedContributors,
    };
  }

  private calculateRecencyScore(recentEvents: any[]) {
    if (!recentEvents || recentEvents.length === 0) {
      return 0;
    }

    const latest = recentEvents[0]?.timestamp ? new Date(recentEvents[0].timestamp).getTime() : 0;
    const now = Date.now();
    const ageHours = (now - latest) / (60 * 60 * 1000);

    if (ageHours <= 24) {
      return 10;
    }
    if (ageHours <= 72) {
      return 6;
    }
    if (ageHours <= 168) {
      return 3;
    }

    return 0;
  }

  async create(data: any) {
    return this.prisma.asset.create({
      data: {
        organizationId: this.organizationId,
        hostname: data.hostname,
        displayName: data.displayName || data.hostname,
        type: data.type as AssetType,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        operatingSystem: data.operatingSystem,
        cloudProvider: data.cloudProvider,
        region: data.region,
        owner: data.owner,
        department: data.department,
        businessCriticality: (data.businessCriticality as AssetCriticality) || AssetCriticality.MEDIUM,
        environment: (data.environment as Environment) || Environment.DEV,
        isInternetFacing: data.isInternetFacing || false,
        monitoringStatus: 'ACTIVE',
        tags: data.tags || [],
      },
    });
  }

  async update(id: string, data: any) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const updateData: Prisma.AssetUpdateInput = {};
    if (data.hostname !== undefined) updateData.hostname = data.hostname;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.type !== undefined) updateData.type = data.type as AssetType;
    if (data.environment !== undefined) updateData.environment = data.environment as Environment;
    if (data.isInternetFacing !== undefined) updateData.isInternetFacing = Boolean(data.isInternetFacing);
    if (data.businessCriticality !== undefined) updateData.businessCriticality = data.businessCriticality as AssetCriticality;
    if (data.monitoringStatus !== undefined) updateData.monitoringStatus = data.monitoringStatus;
    if (data.owner !== undefined) updateData.owner = data.owner;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.tags !== undefined) updateData.tags = data.tags;

    return this.prisma.asset.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }
}
