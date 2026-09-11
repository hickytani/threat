import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job, UnrecoverableError } from 'bullmq';
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
    const redisUrl = process.env.REDIS_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDevFallback = process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK === 'true' || !isProduction;

    if (redisUrl) {
      this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null, enableOfflineQueue: false });
    } else if (allowDevFallback) {
      this.connection = new MockRedis();
    } else {
      throw new Error('REDIS_URL missing for QueueWorker in production mode.');
    }

    // 1. Ingestion Queue Worker
    this.ingestionWorker = new Worker(
      'telemetry-ingestion',
      async (job: Job) => {
        const { organizationId, title, description, severity, category, source, hostname, ipAddress, rawEvent, requestId, correlationId, idempotencyKey } = job.data;
        const logPrefix = `[req_${requestId || 'none'}] [corr_${correlationId || job.id}]`;

        this.logger.log(`${logPrefix} Processing telemetry ingestion job: ${job.id} for host: ${hostname}`);

        // Validate Tenant Context
        if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
          this.logger.error(`${logPrefix} Missing or invalid tenant context in job ${job.id}`);
          throw new UnrecoverableError('Missing tenant context in queued job.');
        }

        const org = await this.prisma.organization.findUnique({
          where: { id: organizationId },
        });
        if (!org) {
          this.logger.error(`${logPrefix} Tenant ${organizationId} not found in database for job ${job.id}`);
          throw new UnrecoverableError(`Tenant with ID ${organizationId} does not exist.`);
        }

        // Idempotency Check: check if identical alert/event already processed
        const eventId = rawEvent?.eventId || idempotencyKey;
        if (eventId) {
          const existingAlert = await this.prisma.alert.findFirst({
            where: {
              organizationId,
              rawEvent: {
                path: ['eventId'],
                equals: eventId,
              },
            },
          });
          if (existingAlert) {
            this.logger.log(`${logPrefix} Duplicate job delivery detected for event ${eventId}. Idempotently skipping alert creation.`);
            return { alertId: existingAlert.id, assetId: existingAlert.assetId, correlated: false, status: 'skipped_duplicate' };
          }
        }

        // Perform Asset resolution, Alert creation, and Asset risk update atomically
        const result = await this.prisma.$transaction(async (tx) => {
          let asset = await tx.asset.findFirst({
            where: { hostname, organizationId },
          });

          if (!asset) {
            asset = await tx.asset.create({
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

          const alert = await tx.alert.create({
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
              rawEvent: {
                ...rawEvent,
                eventId: eventId || `job_${job.id}`,
                requestId,
                correlationId,
              } as any,
              tags: ['IngestedQueue'] as any,
            },
          });

          await tx.asset.update({
            where: { id: asset.id },
            data: { activeAlertCount: { increment: 1 } },
          });

          return { alert, asset };
        });

        // Run correlation engine rules
        const correlatedIncident = await this.correlationService.correlateAlert(result.alert);

        // Automated Escalation trigger fallback: If severity is CRITICAL and not correlated, trigger standard escalation
        if (!correlatedIncident && result.alert.severity === AlertSeverity.CRITICAL) {
          this.logger.log(`${logPrefix} Critical Alert detected, pushing to escalation queue: alertId=${result.alert.id}`);
          await this.queueService.addEscalationJob({
            alertId: result.alert.id,
            userId: 'system',
            fullName: 'Automation Orchestrator',
            organizationId,
            requestId,
            correlationId,
          });
        }

        return { alertId: result.alert.id, assetId: result.asset.id, correlated: !!correlatedIncident };
      },
      { connection: this.connection, concurrency: 5 },
    );

    // 2. Escalation Queue Worker
    this.escalationWorker = new Worker(
      'alert-escalation',
      async (job: Job) => {
        const { alertId, userId, fullName, organizationId, requestId, correlationId } = job.data;
        const logPrefix = `[req_${requestId || 'none'}] [corr_${correlationId || job.id}]`;

        this.logger.log(`${logPrefix} Processing alert escalation job: ${job.id} for alertId: ${alertId}`);

        if (!organizationId || typeof organizationId !== 'string') {
          throw new UnrecoverableError('Missing tenant context in escalation job.');
        }

        const alert = await this.prisma.alert.findFirst({
          where: { id: alertId, organizationId },
        });

        if (!alert) {
          throw new UnrecoverableError(`Alert with ID ${alertId} not found in organization.`);
        }

        if (alert.status === AlertStatus.ESCALATED || alert.incidentId) {
          this.logger.log(`${logPrefix} Alert ${alertId} is already escalated.`);
          return { status: 'skipped', reason: 'already_escalated' };
        }

        const incident = await this.prisma.$transaction(async (tx) => {
          const inc = await tx.incident.create({
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
              slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
              tags: ['Escalated', 'QueueTrigger'] as any,
            },
          });

          await tx.alert.update({
            where: { id: alertId },
            data: {
              incidentId: inc.id,
              status: AlertStatus.ESCALATED,
            },
          });

          await tx.incidentComment.create({
            data: {
              incidentId: inc.id,
              authorId: userId,
              authorName: fullName,
              content: `Autonomous incident escalation worker successfully mapped alert footprint ${alert.id} to this ticket.`,
            },
          });

          await tx.auditLog.create({
            data: {
              organizationId,
              actorId: userId,
              actorEmail: 'orchestrator@threatsync.local',
              action: 'QUEUE_AUTO_ESCALATION',
              resourceType: 'ALERT',
              resourceId: alertId,
              requestId: requestId || `job_${job.id}`,
              outcome: 'SUCCESS',
              newValues: { incidentId: inc.id, correlationId } as any,
            },
          });

          return inc;
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

