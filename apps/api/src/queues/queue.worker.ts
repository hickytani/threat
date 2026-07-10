import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service.js';
import { QueueService } from './queue.service.js';
import { CorrelationService } from './correlation.service.js';
import { AlertStatus, AlertSeverity, IncidentStatus, AssetType, AssetCriticality, Environment } from '@prisma/client';
import MockRedis from 'ioredis-mock';
import Redis from 'ioredis';

@Injectable()
export class QueueWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorker.name);
  private ingestionWorker!: Worker;
  private escalationWorker!: Worker;
  private connection: any;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private correlationService: CorrelationService,
  ) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      this.connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
      });
    } else {
      this.connection = new MockRedis();
    }

    // 1. Ingestion Queue Worker
    this.ingestionWorker = new Worker(
      'telemetry-ingestion',
      async (job: Job) => {
        const { organizationId, title, description, severity, category, source, hostname, ipAddress, rawEvent } = job.data;
        this.logger.log(`Processing telemetry ingestion job: ${job.id} for host: ${hostname}`);

        // Resolve or create asset under organization context
        let asset = await this.prisma.asset.findFirst({
          where: { hostname, organizationId },
        });

        if (!asset) {
          asset = await this.prisma.asset.create({
            data: {
              organizationId,
              hostname,
              displayName: hostname,
              type: AssetType.SERVER,
              ipAddress,
              businessCriticality: AssetCriticality.MEDIUM,
              environment: Environment.DEV,
              isInternetFacing: false,
              monitoringStatus: 'ACTIVE',
              riskScore: 35.0,
              tags: ['AutoIngested'] as any,
            },
          });
        }

        // Create alert
        const alert = await this.prisma.alert.create({
          data: {
            organizationId,
            title,
            description,
            severity: severity as AlertSeverity,
            status: AlertStatus.NEW,
            category,
            source,
            assetId: asset.id,
            ipAddress,
            confidenceScore: 90.0,
            rawEvent: rawEvent as any,
            tags: ['IngestedQueue'] as any,
          },
        });

        // Increment alert count on asset
        await this.prisma.asset.update({
          where: { id: asset.id },
          data: { activeAlertCount: { increment: 1 } },
        });

        // Run correlation engine rules
        const correlatedIncident = await this.correlationService.correlateAlert(alert);

        // Automated Escalation trigger fallback: If severity is CRITICAL and not correlated, trigger standard escalation
        if (!correlatedIncident && alert.severity === AlertSeverity.CRITICAL) {
          this.logger.log(`Critical Alert detected, pushing to escalation queue: alertId=${alert.id}`);
          await this.queueService.addEscalationJob({
            alertId: alert.id,
            userId: 'system',
            fullName: 'Automation Orchestrator',
            organizationId,
          });
        }

        return { alertId: alert.id, assetId: asset.id, correlated: !!correlatedIncident };
      },
      { connection: this.connection, concurrency: 5 },
    );

    // 2. Escalation Queue Worker
    this.escalationWorker = new Worker(
      'alert-escalation',
      async (job: Job) => {
        const { alertId, userId, fullName, organizationId } = job.data;
        this.logger.log(`Processing alert escalation job: ${job.id} for alertId: ${alertId}`);

        const alert = await this.prisma.alert.findFirst({
          where: { id: alertId, organizationId },
        });

        if (!alert) {
          throw new Error(`Alert with ID ${alertId} not found in organization.`);
        }

        if (alert.status === AlertStatus.ESCALATED) {
          this.logger.log(`Alert ${alertId} is already escalated.`);
          return { status: 'skipped', reason: 'already_escalated' };
        }

        // Create Incident
        const incident = await this.prisma.incident.create({
          data: {
            organizationId,
            title: `Escalated Alert: ${alert.title}`,
            summary: `Autonomous escalation process created incident from Alert ID ${alert.id}. Category: ${alert.category}.`,
            severity: alert.severity,
            priority: alert.severity,
            status: IncidentStatus.OPEN,
            incidentType: alert.category,
            assignedAnalystId: userId === 'system' ? undefined : userId,
            assignedAnalystName: fullName,
            detectionTime: alert.timestamp,
            slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
            tags: ['Escalated', 'QueueTrigger'] as any,
          },
        });

        // Link Alert
        await this.prisma.alert.update({
          where: { id: alertId },
          data: {
            incidentId: incident.id,
            status: AlertStatus.ESCALATED,
          },
        });

        // Add System Comment to Incident
        await this.prisma.incidentComment.create({
          data: {
            incidentId: incident.id,
            authorId: userId,
            authorName: fullName,
            content: `Autonomous incident escalation worker successfully mapped alert footprint ${alert.id} to this ticket.`,
          },
        });

        // Create Audit Log
        await this.prisma.auditLog.create({
          data: {
            organizationId,
            actorId: userId,
            actorEmail: 'orchestrator@threatsync.local',
            action: 'QUEUE_AUTO_ESCALATION',
            resourceType: 'ALERT',
            resourceId: alertId,
            requestId: 'job_' + job.id,
            outcome: 'SUCCESS',
            newValues: { incidentId: incident.id } as any,
          },
        });

        return { incidentId: incident.id };
      },
      { connection: this.connection, concurrency: 2 },
    );

    this.ingestionWorker.on('failed', (job, err) => {
      this.logger.error(`Telemetry ingestion job ${job?.id} failed: ${err.message}`);
    });

    this.escalationWorker.on('failed', (job, err) => {
      this.logger.error(`Alert escalation job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.ingestionWorker?.close();
    await this.escalationWorker?.close();
    if (this.connection && typeof this.connection.disconnect === 'function') {
      await this.connection.disconnect();
    }
  }
}
