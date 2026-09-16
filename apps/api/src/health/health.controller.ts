import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../common/prisma.service.js';
import { QueueService } from '../queues/queue.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  @Get('live')
  live() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready(@Res() res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDevFallback = process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK === 'true' || !isProduction;

    try {
      // 1. Check Database connection
      await this.prisma.$queryRaw`SELECT 1`;

      // 2. Check Queue Redis connection
      const redisAlive = await this.queueService.pingRedis();
      if (!redisAlive && isProduction && !allowDevFallback) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          status: 'not_ready',
          error: 'Redis connection unavailable in production mode',
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(HttpStatus.OK).json({
        status: 'ready',
        redis: redisAlive ? (this.queueService.isUsingMockFallback() ? 'in_memory_fallback' : 'connected') : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        error: err instanceof Error ? err.message : 'Database or infrastructure dependency check failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('dependencies')
  async dependencies() {
    let dbStatus = 'UP';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DOWN';
    }

    const redisAlive = await this.queueService.pingRedis();
    let redisStatus = 'DOWN';
    if (redisAlive) {
      redisStatus = this.queueService.isUsingMockFallback() ? 'UP (In-memory Fallback)' : 'UP';
    }

    const isHealthy = dbStatus === 'UP' && (redisAlive || process.env.NODE_ENV !== 'production');

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

