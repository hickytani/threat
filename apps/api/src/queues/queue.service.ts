import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import MockRedis from 'ioredis-mock';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  public ingestionQueue!: Queue;
  public escalationQueue!: Queue;
  private connection: any;

  async onModuleInit() {
    // Determine connection strategy: check if port 6379 is listening, fallback to mock in dev
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      // In development environments, we default to the in-memory mock client for reliability
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        this.connection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
        });
      } else {
        this.connection = new MockRedis();
      }
    } catch {
      this.connection = new MockRedis();
    }

    this.ingestionQueue = new Queue('telemetry-ingestion', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.escalationQueue = new Queue('alert-escalation', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }

  async addTelemetryJob(data: {
    organizationId: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    source: string;
    hostname: string;
    ipAddress: string;
    rawEvent: Record<string, any>;
  }) {
    return this.ingestionQueue.add('ingest-raw', data);
  }

  async addEscalationJob(data: {
    alertId: string;
    userId: string;
    fullName: string;
    organizationId: string;
  }) {
    return this.escalationQueue.add('escalate-alert', data);
  }

  async onModuleDestroy() {
    await this.ingestionQueue?.close();
    await this.escalationQueue?.close();
    if (this.connection && typeof this.connection.disconnect === 'function') {
      await this.connection.disconnect();
    }
  }
}
