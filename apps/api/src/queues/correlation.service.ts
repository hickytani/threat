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
   * Deterministic correlation engine.
   * Evaluates an incoming alert against three explicit patterns to determine
   * whether an incident should be created or an existing one extended.
   * This is rule-based logic — not probabilistic, not AI-driven.
   */
  async correlateAlert(alert: Alert) {
    this.logger.log(`Evaluating correlation rules for alert: id=${alert.id}, category=${alert.category}`);

    const existingIncident = await this.findExistingCorrelatedIncident(alert);
    if (existingIncident) {
      this.logger.log(`Found existing correlated incident ${existingIncident.id} for alert ${alert.id}.`);
      // Link alert to existing incident without creating a duplicate
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: { incidentId: existingIncident.id },
      });
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
    let correlationDimension = '';
    const correlatedAlertIds = [alert.id, ...similarAlerts.map(a => a.id)];

    if (uniqueAssetIds.size >= 3) {
      triggerEscalation = true;
      correlationDimension = 'MULTI_ASSET_LATERAL_MOVEMENT';
      correlationReason = `Lateral threat movement pattern: Alerts detected across ${uniqueAssetIds.size} distinct assets within 1 hour sharing the same source IP, domain, or user identity.`;
    } else if (iocMatch) {
      triggerEscalation = true;
      correlationDimension = 'MALICIOUS_IOC_MATCH';
      correlationReason = `Threat intelligence match: Traffic matches malicious IOC [${iocMatch.value}] (type: ${iocMatch.type}, label: ${iocMatch.label}).`;
    } else if (vulnMatch) {
      triggerEscalation = true;
      correlationDimension = 'CRITICAL_VULN_EXPLOIT_ATTEMPT';
      correlationReason = `Exposed vulnerability exploit pattern: High-severity alert on internet-facing asset with unresolved CVSS 9.0+ vulnerabilities.`;
    }

    if (triggerEscalation) {
      this.logger.log(`Correlation pattern matched [${correlationDimension}]. Creating incident from ${correlatedAlertIds.length} correlated alerts.`);

      const severityLabel = [alert.severity, ...similarAlerts.map(a => a.severity)]
        .includes('CRITICAL') ? 'CRITICAL' : 'HIGH';

      // Create Incident
      const incident = await this.prisma.incident.create({
        data: {
          organizationId: alert.organizationId,
          title: `Correlated Security Incident: ${alert.category} Threat Group`,
          summary: `${correlationReason}\n\nCorrelation dimension: ${correlationDimension}\nCorrelated alert IDs: ${correlatedAlertIds.join(', ')}`,
          severity: severityLabel as any,
          priority: 'HIGH' as any,
          status: 'OPEN' as any,
          incidentType: 'CORRELATED_THREAT_GROUP',
          detectionTime: new Date(),
          slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
          tags: ['CorrelationEngine', correlationDimension] as any,
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

      // Log correlation evidence as an internal incident comment
      await this.prisma.incidentComment.create({
        data: {
          incidentId: incident.id,
          authorId: 'system',
          authorName: 'Correlation Engine',
          content: [
            `Correlation engine grouped ${correlatedAlertIds.length} alert(s) under this incident.`,
            `Pattern: ${correlationDimension}`,
            `Reason: ${correlationReason}`,
            `Alert IDs: ${correlatedAlertIds.join(', ')}`,
          ].join('\n'),
          isInternalOnly: true,
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
