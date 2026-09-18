import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import MockRedis from 'ioredis-mock';
import type { IngestEventInput } from '../events/event-pipeline.service.js';

export interface TelemetryJobData {
  organizationId: string;
  input?: IngestEventInput;
  title: string;
  description: string;
  severity: string;
  category: string;
  source: string;
  hostname: string;
  ipAddress: string;
  rawEvent: Record<string, any>;
  requestId?: string;
  correlationId?: string;
  idempotencyKey?: string;
}

export interface EscalationJobData {
  alertId: string;
  userId: string;
  fullName: string;
  organizationId: string;
  requestId?: string;
  correlationId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  public ingestionQueue!: Queue;
  public escalationQueue!: Queue;
  private connection: any;
  private isMockFallback = false;

  async onModuleInit() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDevFallback = process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK === 'true' || !isProduction;
    const redisUrl = process.env.REDIS_URL;

    if (isProduction && !redisUrl && !allowDevFallback) {
      const err = new Error('PRODUCTION BOUNDARY VIOLATION: REDIS_URL environment variable is required in production mode when ENABLE_IN_MEMORY_QUEUE_FALLBACK is false.');
      this.logger.error(err.message);
      throw err;
    }

    try {
      if (redisUrl) {
        this.connection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            if (isProduction && !allowDevFallback && times > 5) {
              return null; // Stop retrying and fail closed in prod
            }
            return Math.min(times * 200, 2000);
          },
        });
        this.isMockFallback = false;
      } else if (allowDevFallback) {
        this.logger.warn('REDIS_URL not configured. Operating in local development fallback mode with in-memory mock Redis.');
        this.connection = new MockRedis();
        this.isMockFallback = true;
      } else {
        throw new Error('REDIS_URL missing and in-memory fallback disabled.');
      }
    } catch (err: any) {
      if (isProduction && !allowDevFallback) {
        this.logger.error(`Failed to connect to Redis in production: ${err.message}`);
        throw err;
      }
      this.logger.warn(`Redis connection failed (${err.message}). Using local in-memory fallback.`);
      this.connection = new MockRedis();
      this.isMockFallback = true;
    }

    const defaultJobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    };

    this.ingestionQueue = new Queue('telemetry-ingestion', {
      connection: this.connection,
      defaultJobOptions,
    });

    this.escalationQueue = new Queue('alert-escalation', {
      connection: this.connection,
      defaultJobOptions,
    });
  }

  async addTelemetryJob(data: TelemetryJobData) {
    const jobId = data.idempotencyKey || (data.rawEvent?.eventId ? `evt_${data.rawEvent.eventId}` : undefined);
    return this.ingestionQueue.add('ingest-raw', data, jobId ? { jobId } : undefined);
  }

  async addEscalationJob(data: EscalationJobData) {
    const jobId = data.idempotencyKey || `esc_${data.alertId}`;
    return this.escalationQueue.add('escalate-alert', data, jobId ? { jobId } : undefined);
  }

  async pingRedis(): Promise<boolean> {
    try {
      if (this.isMockFallback) {
        return true;
      }
      if (this.connection && typeof this.connection.ping === 'function') {
        const res = await this.connection.ping();
        return res === 'PONG' || res === 'pong' || res === true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public isUsingMockFallback(): boolean {
    return this.isMockFallback;
  }

  async onModuleDestroy() {
    await this.ingestionQueue?.close();
    await this.escalationQueue?.close();
    if (this.connection && typeof this.connection.disconnect === 'function') {
      await this.connection.disconnect();
    }
  }
}

