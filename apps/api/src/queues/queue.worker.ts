import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Optional } from '@nestjs/common';
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../common/prisma.service.js';
import { QueueService } from './queue.service.js';
import { CorrelationService } from './correlation.service.js';
import { EventPipelineService, IngestEventInput } from '../events/event-pipeline.service.js';
import { AlertStatus, AlertSeverity, IncidentStatus, AssetType, AssetCriticality, Environment } from '@prisma/client';
import MockRedis from 'ioredis-mock';
import Redis from 'ioredis';

@Injectable()
export class QueueWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorker.name);
  private ingestionWorker!: Worker;
  private escalationWorker!: Worker;
  private connection: any;
  private eventPipeline: EventPipelineService;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private correlationService: CorrelationService,
    @Optional() eventPipeline?: EventPipelineService,
  ) {
    this.eventPipeline = eventPipeline || new EventPipelineService(prisma, correlationService);
  }

  async onModuleInit() {
    if (process.env.DISABLE_QUEUE_WORKER === 'true') {
      this.logger.log('QueueWorker is disabled on this instance (DISABLE_QUEUE_WORKER=true). Background jobs are processed by external worker service.');
      return;
    }

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
        const { organizationId, input: queuedInput, title, description, severity, category, source, hostname, ipAddress, rawEvent, requestId, correlationId, idempotencyKey } = job.data;
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

        const eventId = rawEvent?.eventId || idempotencyKey || queuedInput?.metadata?.eventId;
        const input: IngestEventInput = queuedInput || {
          eventType: category || rawEvent?.eventType || 'ENDPOINT_ANOMALY',
          source: source || 'TelemetryIngest',
          action: rawEvent?.action || 'PROCESS_AUDIT',
          outcome: rawEvent?.outcome || 'UNKNOWN',
          severity: severity || 'LOW',
          message: title || description || 'Telemetry Event',
          hostname: hostname || rawEvent?.hostname,
          metadata: {
            ...rawEvent?.metadata,
            ipAddress,
            sourceIp: ipAddress,
            idempotencyKey: idempotencyKey || eventId,
          },
          rawEvent: rawEvent || {
            title,
            description,
            category,
            source,
            hostname,
            ipAddress,
          },
        };

        const result = await this.eventPipeline.processEvent({
          organizationId,
          input,
          actor: { fullName: 'Background Telemetry Worker' },
          context: { requestId, correlationId, idempotencyKey: idempotencyKey || eventId },
        });

        // If any created alert is CRITICAL and was not correlated into an incident, trigger standard escalation job
        for (const alert of result.alertsCreated) {
          const isCorrelated = result.incidentsCreated.length > 0;
          if (!isCorrelated && alert.severity === AlertSeverity.CRITICAL) {
            this.logger.log(`${logPrefix} Critical Alert detected without incident correlation, queuing escalation: alertId=${alert.id}`);
            await this.queueService.addEscalationJob({
              alertId: alert.id,
              userId: 'system',
              fullName: 'Automation Orchestrator',
              organizationId,
              requestId,
              correlationId,
            });
          }
        }

        return {
          eventId: result.storedEvent?.id,
          alertsCount: result.alertsCreated.length,
          incidentsCount: result.incidentsCreated.length,
          deduplicated: result.deduplicated,
        };
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

