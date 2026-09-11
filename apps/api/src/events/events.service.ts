import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { AlertSeverity, AlertStatus } from '@prisma/client';

export interface IngestEventInput {
  eventType?: string;
  source?: string;
  action?: string;
  outcome?: string;
  severity?: string;
  message?: string;
  hostname?: string;
  metadata?: Record<string, any>;
  rawEvent?: Record<string, any>;
}

export interface NormalizedEvent {
  eventId: string;
  organizationId: string;
  timestamp: Date;
  eventType: string;
  source: string;
  assetId?: string;
  sourceIp?: string;
  destinationIp?: string;
  action: string;
  outcome: string;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, any>;
  rawJson: string;
}

@Injectable({ scope: Scope.REQUEST })
export class EventsService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async ingest(input: IngestEventInput) {
    const normalizedEvent = await this.normalizeEvent(input);

    const duplicate = await this.findRecentDuplicateEvent(normalizedEvent);
    if (duplicate) {
      await this.createAuditLog(
        'EVENT_INGESTION_DUPLICATE',
        'SECURITY_EVENT',
        duplicate.id,
        'SUCCESS',
        {
          eventId: normalizedEvent.eventId,
          duplicateEventId: duplicate.id,
          reason: 'recent_duplicate_detected',
        },
      );

      return {
        normalizedEvent,
        storedEvent: duplicate,
        alertsCreated: [],
        deduplicated: true,
      };
    }

    const storedEvent = await this.prisma.securityEvent.create({
      data: {
        organizationId: this.organizationId,
        timestamp: normalizedEvent.timestamp,
        eventType: normalizedEvent.eventType,
        source: normalizedEvent.source,
        assetId: normalizedEvent.assetId,
        userIdentity: normalizedEvent.metadata?.userIdentity || null,
        sourceIp: normalizedEvent.sourceIp || null,
        destinationIp: normalizedEvent.destinationIp || null,
        action: normalizedEvent.action,
        outcome: normalizedEvent.outcome,
        severity: normalizedEvent.severity,
        message: normalizedEvent.message,
        metadata: normalizedEvent.metadata as any,
        rawJson: normalizedEvent.rawJson,
      },
    });

    await this.createAuditLog(
      'EVENT_INGESTION',
      'SECURITY_EVENT',
      storedEvent.id,
      'SUCCESS',
      {
        eventType: normalizedEvent.eventType,
        source: normalizedEvent.source,
        severity: normalizedEvent.severity,
        assetId: normalizedEvent.assetId,
      },
    );

    const alertsCreated = await this.runDetections(normalizedEvent);

    if (normalizedEvent.assetId && alertsCreated.length > 0) {
      await this.updateAssetRisk(normalizedEvent.assetId, normalizedEvent.severity, alertsCreated.length);
    }

    return {
      normalizedEvent,
      storedEvent,
      alertsCreated,
      deduplicated: false,
    };
  }

  async normalizeEvent(input: IngestEventInput): Promise<NormalizedEvent> {
    const eventType = input.eventType || 'UNKNOWN_EVENT';
    const source = input.source || 'UNKNOWN_SOURCE';
    const action = input.action || 'PROCESS_AUDIT';
    const outcome = input.outcome || 'UNKNOWN';
    const severity = this.resolveSeverity(input.severity);

    let assetId: string | undefined;
    if (input.hostname) {
      const asset = await this.prisma.asset.findFirst({
        where: {
          organizationId: this.organizationId,
          hostname: input.hostname,
        },
      });
      assetId = asset?.id;
    }

    const metadata = {
      ...(input.metadata || {}),
      hostname: input.hostname,
    };

    return {
      eventId: `evt_${Date.now().toString(36)}_${this.organizationId.slice(-4)}`,
      organizationId: this.organizationId,
      timestamp: new Date(),
      eventType,
      source,
      assetId,
      action,
      outcome,
      severity,
      message: input.message || 'Received raw event',
      metadata,
      rawJson: JSON.stringify(input.rawEvent || input.metadata || { eventType, source, action, outcome }),
    };
  }

  private resolveSeverity(severity?: string): AlertSeverity {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return AlertSeverity.CRITICAL;
      case 'HIGH': return AlertSeverity.HIGH;
      case 'MEDIUM': return AlertSeverity.MEDIUM;
      default: return AlertSeverity.LOW;
    }
  }

  private async runDetections(event: NormalizedEvent) {
    const rules = await this.prisma.detectionRule.findMany({
      where: {
        organizationId: this.organizationId,
        isEnabled: true,
      },
    });

    const createdAlerts = [] as any[];

    for (const rule of rules) {
      if (this.shouldSuppressRule(rule)) {
        continue;
      }

      const matches = this.matchRule(rule, event);
      if (!matches) continue;

      const matchedAsset = event.assetId
        ? await this.prisma.asset.findFirst({ where: { id: event.assetId, organizationId: this.organizationId } })
        : null;

      const alert = await this.prisma.alert.create({
        data: {
          organizationId: this.organizationId,
          title: `Detection: ${rule.name}`,
          description: `${rule.description || `Matched detection rule ${rule.name}`} Matched event ${event.eventId}.`,
          severity: rule.severity as AlertSeverity,
          status: AlertStatus.NEW,
          category: rule.category,
          source: event.source,
          assetId: event.assetId || matchedAsset?.id,
          userIdentity: event.metadata?.userIdentity || null,
          ipAddress: event.metadata?.sourceIp || event.metadata?.ipAddress || null,
          domain: event.metadata?.domain || null,
          fileHash: event.metadata?.fileHash || null,
          detectionRuleId: rule.id,
          confidenceScore: this.calculateAlertConfidence(rule, event),
          rawEvent: {
            eventId: event.eventId,
            ruleId: rule.id,
            ruleName: rule.name,
            source: event.source,
            matchedConditions: rule.matchConditions || {},
            metadata: event.metadata,
          } as any,
          tags: ['DetectionEngine', rule.category] as any,
        },
      });

      await this.createAuditLog(
        'ALERT_GENERATED',
        'ALERT',
        alert.id,
        'SUCCESS',
        {
          ruleId: rule.id,
          ruleName: rule.name,
          eventId: event.eventId,
          assetId: alert.assetId,
        },
      );

      await this.prisma.detectionRule.update({
        where: { id: rule.id },
        data: {
          lastTriggered: new Date(),
          triggerCount: {
            increment: 1,
          },
        },
      });

      createdAlerts.push({
        id: alert.id,
        title: alert.title,
        category: alert.category,
        severity: alert.severity,
        ruleId: rule.id,
      });
    }

    if (event.assetId && createdAlerts.length > 0) {
      await this.prisma.asset.update({
        where: { id: event.assetId },
        data: {
          activeAlertCount: { increment: createdAlerts.length },
        },
      });
    }

    return createdAlerts;
  }

  private shouldSuppressRule(rule: any): boolean {
    const suppressionPeriod = Number(rule.suppressionPeriod ?? 0);
    if (!suppressionPeriod || !rule.lastTriggered) {
      return false;
    }

    const lastTriggered = rule.lastTriggered instanceof Date ? rule.lastTriggered : new Date(rule.lastTriggered);
    if (Number.isNaN(lastTriggered.getTime())) {
      return false;
    }

    return Date.now() - lastTriggered.getTime() < suppressionPeriod * 1000;
  }

  private matchRule(rule: any, event: NormalizedEvent): boolean {
    const matchConditions = rule.matchConditions || {};
    const hasExplicitConditions = Object.keys(matchConditions).length > 0;

    if (hasExplicitConditions) {
      return this.matchesExplicitConditions(matchConditions, rule, event);
    }

    if (rule.category === 'AUTHENTICATION_ANOMALY' && event.outcome === 'FAILURE') {
      return true;
    }

    if (rule.category === 'ENDPOINT_ANOMALY' && event.metadata?.processName) {
      return true;
    }

    if (rule.category === 'THREAT_INTEL_MATCH' && event.metadata?.iocMatched) {
      return true;
    }

    if (rule.category === 'POLICY_VIOLATION' && event.metadata?.policyViolation) {
      return true;
    }

    return false;
  }

  private matchesExplicitConditions(matchConditions: Record<string, any>, rule: any, event: NormalizedEvent): boolean {
    const conditions = { ...matchConditions };

    if (conditions.category && conditions.category !== rule.category) {
      return false;
    }

    const minimumAttempts = Number(conditions.minimumAttempts ?? conditions.minimum_attempts ?? 0);
    const attemptCount = Number(event.metadata?.attemptCount ?? event.metadata?.attempts ?? event.metadata?.count ?? 0);

    if (minimumAttempts > 0 && attemptCount < minimumAttempts) {
      return false;
    }

    delete conditions.minimumAttempts;
    delete conditions.minimum_attempts;

    for (const [key, expectedValue] of Object.entries(conditions)) {
      if (key === 'metadata' && typeof expectedValue === 'object' && expectedValue) {
        const nestedMetadata = expectedValue as Record<string, any>;

        for (const [nestedKey, nestedExpectedValue] of Object.entries(nestedMetadata)) {
          if (event.metadata?.[nestedKey] !== nestedExpectedValue) {
            return false;
          }
        }

        continue;
      }

      if (event[key as keyof NormalizedEvent] !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  private calculateAlertConfidence(rule: any, event: NormalizedEvent): number {
    const baseScore = {
      CRITICAL: 95,
      HIGH: 88,
      MEDIUM: 81,
      LOW: 72,
      INFORMATIONAL: 65,
    }[rule.severity as AlertSeverity] ?? 80;

    const attemptBoost = Math.min(10, Number(event.metadata?.attemptCount ?? 0) * 0.5);

    return Math.min(99, Math.round(baseScore + attemptBoost));
  }

  private async findRecentDuplicateEvent(event: NormalizedEvent) {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);

    return this.prisma.securityEvent.findFirst({
      where: {
        organizationId: this.organizationId,
        eventType: event.eventType,
        source: event.source,
        action: event.action,
        outcome: event.outcome,
        message: event.message,
        timestamp: {
          gte: threshold,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  private async updateAssetRisk(assetId: string, severity: AlertSeverity, alertCount: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return;
    }

    const severityWeight: Record<AlertSeverity, number> = {
      [AlertSeverity.INFORMATIONAL]: 2,
      [AlertSeverity.LOW]: 5,
      [AlertSeverity.MEDIUM]: 12,
      [AlertSeverity.HIGH]: 22,
      [AlertSeverity.CRITICAL]: 35,
    };

    const vulnerabilityWeight = (asset.vulnerabilityCount || 0) * 1.5;
    const activeAlertWeight = Math.min(20, (asset.activeAlertCount || 0) * 2);
    const nextRisk = Math.min(
      100,
      Math.round((asset.riskScore || 0) * 0.65 + severityWeight[severity] + vulnerabilityWeight + activeAlertWeight + alertCount * 3),
    );

    await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        riskScore: nextRisk,
      },
    });
  }

  private async createAuditLog(action: string, resourceType: string, resourceId: string, outcome: string, newValues: Record<string, any>) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: this.organizationId,
        actorId: this.request.user?.id || 'system',
        actorEmail: this.request.user?.email || 'system@threatsync.local',
        action,
        resourceType,
        resourceId,
        requestId: `evt_${Date.now().toString(36)}_${this.organizationId.slice(-4)}`,
        outcome,
        newValues: newValues as any,
      },
    });
  }
}
