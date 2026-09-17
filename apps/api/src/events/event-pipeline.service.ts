import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CorrelationService } from '../queues/correlation.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AlertSeverity, AlertStatus, AssetCriticality, AssetType, Environment, Prisma } from '@prisma/client';

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

export interface EventProcessingResult {
  normalizedEvent: NormalizedEvent;
  storedEvent: any;
  alertsCreated: any[];
  incidentsCreated: any[];
  deduplicated: boolean;
}

@Injectable()
export class EventPipelineService {
  private readonly logger = new Logger(EventPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationService: CorrelationService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Canonical event processing pipeline for ThreatSync OS.
   * Executed identically by both synchronous HTTP ingestion and background queue workers.
   */
  async processEvent(params: {
    organizationId: string;
    input: IngestEventInput;
    actor?: { id?: string; email?: string; fullName?: string };
    context?: { requestId?: string; correlationId?: string; idempotencyKey?: string };
  }): Promise<EventProcessingResult> {
    const { organizationId, input, actor, context } = params;
    const logPrefix = `[org_${organizationId.slice(-4)}] [req_${context?.requestId || 'none'}]`;

    // 1. Verify organization exists
    if (this.prisma.organization?.findUnique) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });
      if (!org) {
        throw new Error(`Tenant with ID ${organizationId} does not exist.`);
      }
    }

    // 2. Normalize event & resolve/auto-register asset
    const normalizedEvent = await this.normalizeEvent(organizationId, input);

    // 3. Sliding window deduplication check (5 minutes)
    const duplicate = await this.findRecentDuplicateEvent(organizationId, normalizedEvent, context?.idempotencyKey);
    if (duplicate) {
      this.logger.log(`${logPrefix} Duplicate event detected (matched ${duplicate.id}). Skipping alert generation.`);

      await this.createAuditLog(
        organizationId,
        actor,
        context?.requestId,
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
        incidentsCreated: [],
        deduplicated: true,
      };
    }

    // 4. Persist SecurityEvent record in database
    const storedEvent = await this.prisma.securityEvent.create({
      data: {
        organizationId,
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
      organizationId,
      actor,
      context?.requestId,
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

    // 5. Evaluate Detection Rules
    const alertsCreated = await this.runDetections(organizationId, normalizedEvent, actor, context);

    // 5.1 Evaluate Notification Policies
    if (this.notificationsService?.evaluateAndDispatchAlertNotifications) {
      for (const alert of alertsCreated) {
        try {
          await this.notificationsService.evaluateAndDispatchAlertNotifications(organizationId, alert);
        } catch (err: any) {
          this.logger.warn(`${logPrefix} Notification dispatch error for alert ${alert.id}: ${err.message}`);
        }
      }
    }

    // 6. Run Correlation Engine for every generated alert
    const incidentsCreated: any[] = [];
    if (this.correlationService?.correlateAlert && this.prisma.incident && Boolean(this.prisma.alert?.findMany)) {
      for (const alert of alertsCreated) {
        try {
          let dbAlert = alert;
          if (Boolean(this.prisma.alert?.findUnique)) {
            const found = await this.prisma.alert.findUnique({ where: { id: alert.id } });
            if (found) dbAlert = found;
          }
          const correlated = await this.correlationService.correlateAlert(dbAlert);
          if (correlated && !incidentsCreated.some((inc) => inc.id === correlated.id)) {
            incidentsCreated.push(correlated);
          }
        } catch (err: any) {
          this.logger.warn(`${logPrefix} Correlation error for alert ${alert.id}: ${err.message}`);
        }
      }
    }

    // 7. Update target asset risk score if alerts were generated
    if (normalizedEvent.assetId && alertsCreated.length > 0) {
      await this.updateAssetRisk(normalizedEvent.assetId, normalizedEvent.severity, alertsCreated.length);
    }

    this.logger.log(
      `${logPrefix} Processed event ${storedEvent.id} -> ${alertsCreated.length} alert(s), ${incidentsCreated.length} incident(s).`,
    );

    return {
      normalizedEvent,
      storedEvent,
      alertsCreated,
      incidentsCreated,
      deduplicated: false,
    };
  }

  async normalizeEvent(organizationId: string, input: IngestEventInput): Promise<NormalizedEvent> {
    const eventType = input.eventType || 'UNKNOWN_EVENT';
    const source = input.source || 'TelemetryIngest';
    const action = input.action || 'PROCESS_AUDIT';
    const outcome = input.outcome || 'UNKNOWN';
    const severity = this.resolveSeverity(input.severity);

    let assetId: string | undefined;
    const hostname = input.hostname || input.metadata?.hostname;
    const ipAddress = input.metadata?.sourceIp || input.metadata?.ipAddress;

    if (hostname && this.prisma.asset?.findFirst) {
      let asset = await this.prisma.asset.findFirst({
        where: {
          organizationId,
          hostname,
        },
      });

      if (!asset && this.prisma.asset?.create) {
        // Auto-discover / register asset node for incoming telemetry
        try {
          asset = await this.prisma.asset.create({
            data: {
              organizationId,
              hostname,
              displayName: hostname,
              type: AssetType.SERVER,
              ipAddress: ipAddress || '0.0.0.0',
              businessCriticality: AssetCriticality.MEDIUM,
              environment: Environment.DEV,
              isInternetFacing: false,
              monitoringStatus: 'ACTIVE',
              riskScore: 35.0,
              tags: ['AutoDiscovered'] as any,
            },
          });
        } catch {
          asset = await this.prisma.asset.findFirst({
            where: { organizationId, hostname },
          });
        }
      }
      assetId = asset?.id;
    }

    const metadata = {
      ...(input.metadata || {}),
      hostname: hostname || undefined,
    };

    return {
      eventId: `evt_${Date.now().toString(36)}_${organizationId.slice(-4)}`,
      organizationId,
      timestamp: new Date(),
      eventType,
      source,
      assetId,
      sourceIp: ipAddress || input.metadata?.sourceIp || undefined,
      destinationIp: input.metadata?.destinationIp || undefined,
      action,
      outcome,
      severity,
      message: input.message || `Telemetry event received: ${eventType}`,
      metadata,
      rawJson: JSON.stringify(input.rawEvent || input.metadata || { eventType, source, action, outcome }),
    };
  }

  private resolveSeverity(severity?: string): AlertSeverity {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return AlertSeverity.CRITICAL;
      case 'HIGH':
        return AlertSeverity.HIGH;
      case 'MEDIUM':
        return AlertSeverity.MEDIUM;
      default:
        return AlertSeverity.LOW;
    }
  }

  private async runDetections(
    organizationId: string,
    event: NormalizedEvent,
    actor?: { id?: string; email?: string; fullName?: string },
    context?: { requestId?: string; correlationId?: string },
  ) {
    const rules = await this.prisma.detectionRule.findMany({
      where: {
        organizationId,
        isEnabled: true,
      },
    });

    const createdAlerts: any[] = [];

    for (const rule of rules) {
      if (this.shouldSuppressRule(rule)) {
        continue;
      }

      const matches = this.matchRule(rule, event);
      if (!matches) continue;

      const alert = await this.prisma.alert.create({
        data: {
          organizationId,
          title: `Detection: ${rule.name}`,
          description: `${rule.description || `Matched detection rule ${rule.name}.`} Matched event ${event.eventId}.`,
          severity: rule.severity as AlertSeverity,
          status: AlertStatus.NEW,
          category: rule.category,
          source: event.source,
          assetId: event.assetId || null,
          userIdentity: event.metadata?.userIdentity || null,
          ipAddress: event.sourceIp || event.metadata?.sourceIp || event.metadata?.ipAddress || null,
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
            requestId: context?.requestId,
            correlationId: context?.correlationId,
          } as any,
          tags: ['DetectionEngine', rule.category] as any,
        },
      });

      await this.createAuditLog(
        organizationId,
        actor,
        context?.requestId,
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
          triggerCount: { increment: 1 },
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
    delete conditions.category;

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

      if ((event as any)[key] !== expectedValue) {
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

  private async findRecentDuplicateEvent(organizationId: string, event: NormalizedEvent, idempotencyKey?: string) {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);

    if (idempotencyKey) {
      const byKey = await this.prisma.securityEvent.findFirst({
        where: {
          organizationId,
          rawJson: { contains: idempotencyKey },
          timestamp: { gte: threshold },
        },
      });
      if (byKey) return byKey;
    }

    return this.prisma.securityEvent.findFirst({
      where: {
        organizationId,
        eventType: event.eventType,
        source: event.source,
        action: event.action,
        outcome: event.outcome,
        message: event.message,
        timestamp: { gte: threshold },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  private async updateAssetRisk(assetId: string, severity: AlertSeverity, alertCount: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) return;

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
      data: { riskScore: nextRisk },
    });
  }

  private async createAuditLog(
    organizationId: string,
    actor?: { id?: string; email?: string; fullName?: string },
    requestId?: string,
    action?: string,
    resourceType?: string,
    resourceId?: string,
    outcome?: string,
    newValues?: Record<string, any>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: actor?.id || 'system',
        actorEmail: actor?.email || 'system@threatsync.local',
        action: action || 'SECURITY_EVENT',
        resourceType: resourceType || 'SYSTEM',
        resourceId: resourceId || 'none',
        requestId: requestId || `req_${Date.now().toString(36)}`,
        outcome: outcome || 'SUCCESS',
        newValues: (newValues || {}) as any,
      },
    });
  }
}
