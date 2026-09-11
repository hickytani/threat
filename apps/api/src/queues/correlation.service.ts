import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Alert, AlertSeverity, AlertStatus, IncidentStatus } from '@prisma/client';

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Evaluates ingestion footprint patterns and triggers automated escalations.
   */
  async correlateAlert(alert: Alert) {
    this.logger.log(`Evaluating correlation rules for alert: id=${alert.id}, category=${alert.category}`);

    const existingIncident = await this.findExistingCorrelatedIncident(alert);
    if (existingIncident) {
      this.logger.log(`Found existing correlated incident ${existingIncident.id} for alert ${alert.id}.`);
      return existingIncident;
    }

    const timeThreshold = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour sliding window

    // Pattern 1: Same IP address, domain, or user identity across multiple distinct assets
    const similarAlerts = await this.prisma.alert.findMany({
      where: {
        organizationId: alert.organizationId,
        id: { not: alert.id },
        timestamp: { gte: timeThreshold },
        OR: [
          alert.ipAddress ? { ipAddress: alert.ipAddress } : undefined,
          alert.domain ? { domain: alert.domain } : undefined,
          alert.userIdentity ? { userIdentity: alert.userIdentity } : undefined,
        ].filter(Boolean) as any,
      },
    });

    const uniqueAssetIds = new Set(similarAlerts.map(a => a.assetId).filter(Boolean));
    if (alert.assetId) {
      uniqueAssetIds.add(alert.assetId);
    }

    // Pattern 2: IP or domain matches a known high-severity malicious IOC indicator
    let iocMatch = null;
    const iocValues = [alert.ipAddress, alert.domain].filter(Boolean) as string[];
    if (iocValues.length > 0) {
      iocMatch = await this.prisma.iOC.findFirst({
        where: {
          organizationId: alert.organizationId,
          value: { in: iocValues },
          label: 'MALICIOUS',
        },
      });
    }

    // Pattern 3: High-severity alert targeting an internet-facing asset with critical vulnerabilities
    let vulnMatch = false;
    if (alert.assetId && alert.severity === AlertSeverity.HIGH) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: alert.assetId },
        include: {
          vulnerabilities: {
            where: { status: 'OPEN' },
            include: { vulnerability: true },
          },
        },
      });

      if (asset && asset.isInternetFacing) {
        vulnMatch = asset.vulnerabilities.some(v => v.vulnerability && v.vulnerability.cvssScore >= 9.0);
      }
    }

    let triggerEscalation = false;
    let correlationReason = '';
    const correlatedAlertIds = [alert.id, ...similarAlerts.map(a => a.id)];

    if (uniqueAssetIds.size >= 3) {
      triggerEscalation = true;
      correlationReason = `Lateral threat movement pattern: Active alert footprints detected across ${uniqueAssetIds.size} distinct assets within 1 hour.`;
    } else if (iocMatch) {
      triggerEscalation = true;
      correlationReason = `Threat intel match pattern: Traffic matches malicious indicators of compromise (IOC) bound to [${iocMatch.value}].`;
    } else if (vulnMatch) {
      triggerEscalation = true;
      correlationReason = `Exposed vulnerability exploit pattern: Alert observed on internet-facing asset hosting unresolved CVSS 9.0+ vulnerabilities.`;
    }

    if (triggerEscalation) {
      this.logger.log(`Correlation rules matched! Triggering automated incident escalation...`);

      // Create Incident
      const incident = await this.prisma.incident.create({
        data: {
          organizationId: alert.organizationId,
          title: `Correlated Security Incident: Multi-Asset Threat Group`,
          summary: `${correlationReason}\n\nCorrelated Alert Footprints: ${correlatedAlertIds.join(', ')}`,
          severity: alert.severity === AlertSeverity.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
          priority: AlertSeverity.HIGH,
          status: IncidentStatus.OPEN,
          incidentType: 'CORRELATED_THREAT_GROUP',
          detectionTime: new Date(),
          slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours SLA for correlated threats
          tags: ['CorrelationEngine', 'AutoIncident'] as any,
        },
      });

      // Update all correlated alerts status
      await this.prisma.alert.updateMany({
        where: { id: { in: correlatedAlertIds } },
        data: {
          incidentId: incident.id,
          status: AlertStatus.ESCALATED,
        },
      });

      // Log Comment inside Incident
      await this.prisma.incidentComment.create({
        data: {
          incidentId: incident.id,
          authorId: 'system',
          authorName: 'Correlation Engine',
          content: `Autonomous correlation engine automatically grouped ${correlatedAlertIds.length} alerts under this ticket.\nReason: ${correlationReason}`,
        },
      });

      // Log Audit Record
      await this.prisma.auditLog.create({
        data: {
          organizationId: alert.organizationId,
          actorId: 'system',
          actorEmail: 'correlation-engine@threatsync.local',
          action: 'CORRELATION_AUTO_ESCALATION',
          resourceType: 'INCIDENT',
          resourceId: incident.id,
          requestId: `corr_${Date.now().toString(36)}`,
          outcome: 'SUCCESS',
          newValues: { correlatedAlerts: correlatedAlertIds, reason: correlationReason } as any,
        },
      });

      return incident;
    }

    return null;
  }

  private async findExistingCorrelatedIncident(alert: Alert) {
    const incidentCandidates = (await this.prisma.incident.findMany({
      where: {
        organizationId: alert.organizationId,
        incidentType: 'CORRELATED_THREAT_GROUP',
        status: {
          notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
        },
      },
      include: {
        alerts: true,
      },
    })) ?? [];

    const evidenceKeys = [
      alert.assetId,
      alert.userIdentity,
      alert.ipAddress,
      alert.domain,
    ].filter(Boolean) as string[];

    if (evidenceKeys.length === 0) {
      return null;
    }

    return incidentCandidates.find((incident: any) => {
      return (incident.alerts || []).some((relatedAlert: any) => {
        return evidenceKeys.some((key) => {
          return (
            (relatedAlert.assetId && key === relatedAlert.assetId) ||
            (relatedAlert.userIdentity && key === relatedAlert.userIdentity) ||
            (relatedAlert.ipAddress && key === relatedAlert.ipAddress) ||
            (relatedAlert.domain && key === relatedAlert.domain)
          );
        });
      });
    }) || null;
  }
}
