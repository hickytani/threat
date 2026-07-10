import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../common/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready(@Res() res: Response) {
    try {
      // Direct raw query check
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        error: err instanceof Error ? err.message : 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('dependencies')
  async dependencies() {
    let dbStatus = 'UP';
    // Redis is treated as downstream dependency but with mock fallback
    const redisStatus = process.env.REDIS_URL ? 'UP' : 'DOWN (In-memory Fallback)';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DOWN';
    }

    return {
      status: dbStatus === 'UP' ? 'healthy' : 'degraded',
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
        ai: process.env.AI_PROVIDER || 'mock',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
