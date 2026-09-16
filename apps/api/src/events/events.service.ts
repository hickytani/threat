import { Inject, Injectable, Scope, NotFoundException, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { AlertSeverity, AlertStatus, Prisma } from '@prisma/client';
import { QueueService } from '../queues/queue.service.js';
import { EventPipelineService } from './event-pipeline.service.js';
import { CorrelationService } from '../queues/correlation.service.js';

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
  private pipelineService: EventPipelineService;

  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
    @Optional() private queueService?: QueueService,
    @Optional() pipelineService?: EventPipelineService,
  ) {
    super(request, prisma);
    this.pipelineService = pipelineService || new EventPipelineService(prisma, new CorrelationService(prisma));
  }

  async queueAsyncIngestion(input: IngestEventInput) {
    if (!this.queueService) {
      throw new Error('QueueService is not configured for asynchronous event ingestion.');
    }
    const requestId = (this.request.headers?.['x-request-id'] as string) || (this.request as any)?.id;
    const correlationId = (this.request.headers?.['x-correlation-id'] as string) || requestId;
    const hostname = input.hostname || input.metadata?.hostname || 'unknown-host';
    const ipAddress = input.metadata?.sourceIp || input.metadata?.ipAddress || '0.0.0.0';

    return this.queueService.addTelemetryJob({
      organizationId: this.organizationId,
      title: input.message || `Telemetry Event: ${input.eventType || 'UNKNOWN'}`,
      description: `Ingested asynchronously via queue pipeline from ${input.source || 'agent'}`,
      severity: input.severity || 'LOW',
      category: input.eventType || 'ENDPOINT_ANOMALY',
      source: input.source || 'TelemetryIngest',
      hostname,
      ipAddress,
      rawEvent: {
        ...input.rawEvent,
        eventType: input.eventType,
        metadata: input.metadata,
        message: input.message,
      },
      requestId,
      correlationId,
      idempotencyKey: input.metadata?.idempotencyKey || input.metadata?.eventId,
    });
  }



  async search(query: {
    startTime?: string;
    endTime?: string;
    from?: string;
    to?: string;
    eventType?: string;
    severity?: AlertSeverity;
    source?: string;
    assetId?: string;
    asset?: string;
    userIdentity?: string;
    user?: string;
    ipAddress?: string;
    ip?: string;
    domain?: string;
    ioc?: string;
    detectionStatus?: string;
    page?: number | string;
    pageSize?: number | string;
    limit?: number | string;
  }) {
    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(query.pageSize || query.limit || 20), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.SecurityEventWhereInput = {
      organizationId: this.organizationId,
    };

    const start = query.startTime || query.from;
    const end = query.endTime || query.to;
    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp.gte = new Date(start);
      if (end) where.timestamp.lte = new Date(end);
    }

    if (query.eventType) where.eventType = query.eventType;
    if (query.severity) where.severity = query.severity;
    if (query.source) where.source = query.source;

    const assetId = query.assetId || query.asset;
    if (assetId) where.assetId = assetId;

    const userIdent = query.userIdentity || query.user;
    if (userIdent) {
      where.userIdentity = { contains: userIdent, mode: 'insensitive' };
    }

    const targetIp = query.ipAddress || query.ip;
    if (targetIp) {
      where.OR = [
        { sourceIp: { contains: targetIp, mode: 'insensitive' } },
        { destinationIp: { contains: targetIp, mode: 'insensitive' } },
      ];
    }

    if (query.domain) {
      where.rawJson = { contains: query.domain, mode: 'insensitive' };
    }

    if (query.ioc) {
      const existingOR = where.OR || [];
      where.OR = [
        ...existingOR,
        { sourceIp: { contains: query.ioc, mode: 'insensitive' } },
        { destinationIp: { contains: query.ioc, mode: 'insensitive' } },
        { rawJson: { contains: query.ioc, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.securityEvent.count({ where }),
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      data,
      meta: {
        page: pageNum,
        pageSize: limitNum,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const evt = await this.prisma.securityEvent.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!evt) {
      throw new NotFoundException(`Security event with ID ${id} not found`);
    }

    return evt;
  }

  async ingest(input: IngestEventInput) {
    const actor = {
      id: this.request?.user?.id,
      email: this.request?.user?.email,
      fullName: this.request?.user?.fullName,
    };
    const requestId = (this.request?.headers?.['x-request-id'] as string) || (this.request as any)?.id;
    const correlationId = (this.request?.headers?.['x-correlation-id'] as string) || requestId;
    const idempotencyKey = input.metadata?.idempotencyKey || input.metadata?.eventId;

    return this.pipelineService.processEvent({
      organizationId: this.organizationId,
      input,
      actor,
      context: { requestId, correlationId, idempotencyKey },
    });
  }

  async normalizeEvent(input: IngestEventInput): Promise<NormalizedEvent> {
    return this.pipelineService.normalizeEvent(this.organizationId, input);
  }
}
