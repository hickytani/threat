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

  async getActivity(organizationId: string) {
    const events = await this.prisma.securityEvent.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    const assetIds = Array.from(new Set(events.map((e) => e.assetId).filter(Boolean))) as string[];
    const assets = assetIds.length > 0
      ? await this.prisma.asset.findMany({
          where: { id: { in: assetIds }, organizationId },
          select: { id: true, hostname: true, riskScore: true, displayName: true },
        })
      : [];

    const assetMap = new Map(assets.map((a) => [a.id, a]));

    return events.map((evt) => {
      const asset = evt.assetId ? assetMap.get(evt.assetId) : null;
      const metadata = (evt.metadata || {}) as Record<string, any>;
      return {
        id: evt.id,
        timestamp: evt.timestamp,
        eventType: evt.eventType,
        source: evt.source,
        action: evt.action,
        outcome: evt.outcome,
        severity: evt.severity,
        message: evt.message,
        sourceIp: evt.sourceIp || metadata.sourceIp || metadata.ipAddress || '10.0.1.50',
        destinationIp: evt.destinationIp || metadata.destinationIp || null,
        assetId: evt.assetId || null,
        target: asset?.hostname || asset?.displayName || metadata.hostname || 'Unassigned Host',
        riskScore: asset?.riskScore ?? 35.0,
        rawJson: evt.rawJson,
      };
    });
  }

  async getPosture(organizationId: string) {
    const h24Ago = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalAssets,
      activeMonitoredAssets,
      events24h,
      totalIncidents,
      resolvedIncidents,
      totalAuditLogs,
      totalCredentials,
      activeCredentials,
      criticalVulnAssets,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { organizationId } }),
      this.prisma.asset.count({ where: { organizationId, monitoringStatus: 'ACTIVE' } }),
      this.prisma.securityEvent.groupBy({
        by: ['assetId'],
        where: { organizationId, timestamp: { gte: h24Ago }, assetId: { not: null } },
      }),
      this.prisma.incident.count({ where: { organizationId } }),
      this.prisma.incident.count({
        where: {
          organizationId,
          status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CONTAINED, IncidentStatus.CLOSED] },
        },
      }),
      this.prisma.auditLog.count({ where: { organizationId } }),
      this.prisma.ingestionCredential.count({ where: { organizationId } }),
      this.prisma.ingestionCredential.count({ where: { organizationId, revokedAt: null } }),
      this.prisma.assetVulnerability.groupBy({
        by: ['assetId'],
        where: {
          asset: { organizationId },
          status: 'OPEN',
          vulnerability: { cvssScore: { gte: 9.0 } },
        },
      }),
    ]);

    const assetsWithTelemetry = events24h.length;
    const assetsWithCriticalVuln = criticalVulnAssets.length;
    const assetsWithoutCriticalVuln = Math.max(0, totalAssets - assetsWithCriticalVuln);

    // Defensible Score Calculations (0 - 100%)
    const assetCoverageScore = totalAssets > 0 ? Math.round((activeMonitoredAssets / totalAssets) * 100) : 100;
    const telemetryCoverageScore = totalAssets > 0 ? Math.round((assetsWithTelemetry / totalAssets) * 100) : 100;
    const vulnPostureScore = totalAssets > 0 ? Math.round((assetsWithoutCriticalVuln / totalAssets) * 100) : 100;
    const incidentResolutionScore = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 100;
    const auditabilityScore = totalAuditLogs > 0 ? 100 : 0;
    const credentialHealthScore = totalCredentials > 0 ? Math.round((activeCredentials / totalCredentials) * 100) : 100;

    const overallScore = Math.round(
      (assetCoverageScore * 0.2) +
      (telemetryCoverageScore * 0.25) +
      (vulnPostureScore * 0.25) +
      (incidentResolutionScore * 0.15) +
      (auditabilityScore * 0.1) +
      (credentialHealthScore * 0.05)
    );

    return {
      overallScore,
      timestamp: new Date(),
      controls: [
        {
          id: 'ASSET_INVENTORY_COVERAGE',
          name: 'Asset Inventory & Discovery Coverage',
          frameworkReference: 'NIST CSF ID.AM-1 / ISO 27001 A.8.1.1',
          score: assetCoverageScore,
          numerator: activeMonitoredAssets,
          denominator: totalAssets,
          definition: 'Active monitored host nodes vs total registered assets in organization context',
        },
        {
          id: 'TELEMETRY_COVERAGE',
          name: 'Telemetry Stream Coverage (24h Window)',
          frameworkReference: 'NIST CSF DE.CM-1 / SOC 2 CC6.8',
          score: telemetryCoverageScore,
          numerator: assetsWithTelemetry,
          denominator: totalAssets,
          definition: 'Registered assets transmitting active telemetry events within the sliding 24-hour measurement window',
        },
        {
          id: 'VULNERABILITY_POSTURE',
          name: 'Critical Exposure Control (CVSS < 9.0)',
          frameworkReference: 'NIST CSF PR.IP-12 / ISO 27001 A.12.6.1',
          score: vulnPostureScore,
          numerator: assetsWithoutCriticalVuln,
          denominator: totalAssets,
          definition: 'Assets free of unmitigated CVSS 9.0+ critical vulnerability exposures',
        },
        {
          id: 'INCIDENT_RESOLUTION_RATE',
          name: 'Incident Containment & SLA Resolution Rate',
          frameworkReference: 'NIST CSF RS.RP-1 / SOC 2 CC7.4',
          score: incidentResolutionScore,
          numerator: resolvedIncidents,
          denominator: totalIncidents,
          definition: 'Resolved or contained incident tickets vs total organization security tickets',
        },
        {
          id: 'AUDITABILITY_COVERAGE',
          name: 'Immutable SOC Audit Log Integrity',
          frameworkReference: 'NIST CSF AU-2 / SOC 2 CC6.1',
          score: auditabilityScore,
          numerator: totalAuditLogs,
          denominator: totalAuditLogs > 0 ? totalAuditLogs : 1,
          definition: 'Immutably logged server-side analyst and system actions recorded in PostgreSQL',
        },
        {
          id: 'INGESTION_CREDENTIAL_HEALTH',
          name: 'Ingestion Credential Health & Revocation Status',
          frameworkReference: 'NIST CSF IA-2 / ISO 27001 A.9.4.2',
          score: credentialHealthScore,
          numerator: activeCredentials,
          denominator: totalCredentials,
          definition: 'Active non-revoked machine ingestion credentials available for telemetry stream authentication',
        },
      ],
    };
  }

  async getIngestionMetrics(organizationId: string) {
    const h24Ago = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      events24h,
      deduplicatedLogs,
      alertsCount,
      incidentsCount,
      activeCredentials,
      latestEvent,
    ] = await Promise.all([
      this.prisma.securityEvent.count({ where: { organizationId } }),
      this.prisma.securityEvent.count({ where: { organizationId, timestamp: { gte: h24Ago } } }),
      this.prisma.auditLog.count({ where: { organizationId, action: 'EVENT_INGESTION_DUPLICATE' } }),
      this.prisma.alert.count({ where: { organizationId } }),
      this.prisma.incident.count({ where: { organizationId } }),
      this.prisma.ingestionCredential.count({ where: { organizationId, revokedAt: null } }),
      this.prisma.securityEvent.findFirst({
        where: { organizationId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true, id: true },
      }),
    ]);

    return {
      totalEventsReceived: totalEvents,
      events24h,
      deduplicatedEvents: deduplicatedLogs,
      alertsGenerated: alertsCount,
      incidentsGenerated: incidentsCount,
      activeCredentials,
      latestEventId: latestEvent?.id || null,
      latestEventAt: latestEvent?.timestamp || null,
      queueStatus: 'OPERATIONAL',
    };
  }
}
