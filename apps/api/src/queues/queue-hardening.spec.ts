import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service.js';
import { QueueWorker } from './queue.worker.js';
import { CorrelationService } from './correlation.service.js';
import { HealthController } from '../health/health.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { AlertSeverity, AlertStatus, IncidentStatus, AssetType } from '@prisma/client';
import { UnrecoverableError } from 'bullmq';

jest.mock('bullmq', () => {
  const original = jest.requireActual('bullmq');
  return {
    ...original,
    Queue: jest.fn().mockImplementation((name) => {
      return {
        name,
        add: jest.fn().mockImplementation(async (jobName, data, opts) => {
          return { id: opts?.jobId || 'mock_job_id', name: jobName, data, opts };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Worker: jest.fn().mockImplementation((name, processor) => {
      return {
        name,
        opts: { processor },
        processor,
        close: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
    }),
  };
});

describe('Production Queue Hardening Specification', () => {
  let queueService: QueueService;
  let queueWorker: QueueWorker;
  let correlationService: CorrelationService;
  let healthController: HealthController;
  let prismaMock: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };

    prismaMock = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prismaMock)),
      organization: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          if (where.id === 'org_valid') return { id: 'org_valid', name: 'Valid Org' };
          return null;
        }),
      },
      asset: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      alert: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      incident: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      iOC: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      incidentComment: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },

    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        QueueService,
        QueueWorker,
        CorrelationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    queueService = module.get<QueueService>(QueueService);
    queueWorker = module.get<QueueWorker>(QueueWorker);
    correlationService = module.get<CorrelationService>(CorrelationService);
    healthController = module.get<HealthController>(HealthController);

    await queueService.onModuleInit();
    await queueWorker.onModuleInit();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await queueWorker.onModuleDestroy();
    await queueService.onModuleDestroy();
  });

  describe('1. Production Redis Boundary', () => {
    it('should throw error during initialization if in production mode without REDIS_URL or dev fallback flag', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.REDIS_URL;
      delete process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK;

      const svc = new QueueService();
      await expect(svc.onModuleInit()).rejects.toThrow(/PRODUCTION BOUNDARY VIOLATION/);
    });

    it('should allow in-memory fallback when ENABLE_IN_MEMORY_QUEUE_FALLBACK is explicitly true in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK = 'true';
      delete process.env.REDIS_URL;

      const svc = new QueueService();
      await expect(svc.onModuleInit()).resolves.not.toThrow();
      expect(svc.isUsingMockFallback()).toBe(true);
    });
  });

  describe('2. Tenant Context & Unrecoverable Errors', () => {
    it('should throw UnrecoverableError if job carries missing or empty organizationId', async () => {
      const processor = (queueWorker as any).ingestionWorker.opts.processor;

      const badJob = {
        id: 'job_bad_tenant',
        data: {
          organizationId: '',
          hostname: 'host1',
        },
      };

      await expect(processor(badJob)).rejects.toThrow(UnrecoverableError);
    });

    it('should throw UnrecoverableError if organizationId does not exist in database', async () => {
      const processor = (queueWorker as any).ingestionWorker.opts.processor;

      const jobForeignTenant = {
        id: 'job_foreign',
        data: {
          organizationId: 'org_non_existent',
          hostname: 'host1',
        },
      };

      await expect(processor(jobForeignTenant)).rejects.toThrow(UnrecoverableError);
      expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({ where: { id: 'org_non_existent' } });
    });
  });

  describe('3. Job Delivery Idempotency', () => {
    it('should idempotently skip duplicate telemetry job delivery when eventId already ingested', async () => {
      const processor = (queueWorker as any).ingestionWorker.opts.processor;

      prismaMock.alert.findFirst.mockResolvedValue({
        id: 'alert_existing_123',
        assetId: 'asset_1',
      });

      const duplicateJob = {
        id: 'job_dup',
        data: {
          organizationId: 'org_valid',
          hostname: 'prod-server-01',
          ipAddress: '10.0.0.1',
          severity: 'HIGH',
          title: 'Duplicate execution',
          category: 'ENDPOINT_ANOMALY',
          source: 'EDR',
          rawEvent: { eventId: 'evt_unique_1001' },
          idempotencyKey: 'evt_unique_1001',
        },
      };

      const result = await processor(duplicateJob);

      expect(result.status).toBe('skipped_duplicate');
      expect(result.alertId).toBe('alert_existing_123');
      expect(prismaMock.alert.create).not.toHaveBeenCalled();
    });

    it('should idempotently skip escalation when alert is already escalated', async () => {
      const processor = (queueWorker as any).escalationWorker.opts.processor;

      prismaMock.alert.findFirst.mockResolvedValue({
        id: 'alrt_already_esc',
        organizationId: 'org_valid',
        status: AlertStatus.ESCALATED,
        incidentId: 'inc_existing',
      });

      const job = {
        id: 'job_esc_dup',
        data: {
          alertId: 'alrt_already_esc',
          userId: 'usr_analyst',
          fullName: 'Security Analyst',
          organizationId: 'org_valid',
        },
      };

      const result = await processor(job);
      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('already_escalated');
      expect(prismaMock.incident.create).not.toHaveBeenCalled();
    });
  });

  describe('4. Correlation Tracing & Transactional State', () => {
    it('should execute telemetry ingestion atomically inside a database transaction and log request ID', async () => {
      const processor = (queueWorker as any).ingestionWorker.opts.processor;

      prismaMock.alert.findFirst.mockResolvedValue(null);
      prismaMock.asset.findFirst.mockResolvedValue({ id: 'ast_1', hostname: 'host1' });
      prismaMock.alert.create.mockResolvedValue({
        id: 'alrt_new',
        severity: AlertSeverity.LOW,
      });

      const validJob = {
        id: 'job_trace_1',
        data: {
          organizationId: 'org_valid',
          hostname: 'host1',
          ipAddress: '192.168.1.50',
          severity: 'LOW',
          title: 'Subprocess trace',
          category: 'PROCESS_AUDIT',
          source: 'Sysmon',
          rawEvent: { command: 'netstat' },
          requestId: 'req_tracing_999',
          correlationId: 'corr_chain_888',
        },
      };

      const result = await processor(validJob);

      expect(result.alertId).toBe('alrt_new');
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rawEvent: expect.objectContaining({
              requestId: 'req_tracing_999',
              correlationId: 'corr_chain_888',
            }),
          }),
        }),
      );
    });
  });

  describe('5. Health Readiness Boundaries', () => {
    it('should return 503 SERVICE_UNAVAILABLE on /health/ready if Redis ping fails in production mode', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK;

      jest.spyOn(queueService, 'pingRedis').mockResolvedValue(false);

      const resMock: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await healthController.ready(resMock);

      expect(resMock.status).toHaveBeenCalledWith(503);
      expect(resMock.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          error: expect.stringContaining('Redis connection unavailable'),
        }),
      );
    });

    it('should return 200 OK on /health/ready when DB and Redis ping are healthy', async () => {
      jest.spyOn(queueService, 'pingRedis').mockResolvedValue(true);

      const resMock: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await healthController.ready(resMock);

      expect(resMock.status).toHaveBeenCalledWith(200);
      expect(resMock.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
        }),
      );
    });
  });
});
