import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service.js';
import { QueueWorker } from './queue.worker.js';
import { CorrelationService } from './correlation.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { AlertSeverity, AlertStatus, IncidentStatus, AssetType } from '@prisma/client';

// Mock BullMQ completely to bypass Lua VM limitations of in-memory Redis mocks
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation((name) => {
      return {
        name,
        add: jest.fn().mockImplementation(async (jobName, data) => {
          return { id: 'mock_job_id', name: jobName, data };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Worker: jest.fn().mockImplementation((name, processor) => {
      return {
        name,
        opts: { processor },
        close: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
    }),
  };
});

describe('Queues and Correlation Engine', () => {
  let queueService: QueueService;
  let queueWorker: QueueWorker;
  let correlationService: CorrelationService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      asset: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      alert: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      incident: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      incidentComment: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      iOC: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
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

    await queueService.onModuleInit();
    await queueWorker.onModuleInit();
  });

  afterEach(async () => {
    await queueWorker.onModuleDestroy();
    await queueService.onModuleDestroy();
  });

  it('should successfully register queues and allow adding jobs', async () => {
    expect(queueService.ingestionQueue).toBeDefined();
    expect(queueService.escalationQueue).toBeDefined();

    const jobData = {
      organizationId: 'org_1',
      title: 'Suspicious Execution',
      description: 'Anomalous subprocess execution detected',
      severity: 'CRITICAL',
      category: 'ENDPOINT_ANOMALY',
      source: 'CrowdStrike',
      hostname: 'host-win-prod',
      ipAddress: '192.0.2.15',
      rawEvent: { command: 'whoami' },
    };

    const job = await queueService.addTelemetryJob(jobData);
    expect(job).toBeDefined();
    expect(job.name).toBe('ingest-raw');
    expect(job.data.hostname).toBe('host-win-prod');
  });

  describe('Correlation Rules Evaluation', () => {
    it('should trigger escalation if alert IP matches a known malicious IOC value', async () => {
      const mockAlert = {
        id: 'alrt_1',
        organizationId: 'org_1',
        ipAddress: '198.51.100.99',
        category: 'THREAT_INTEL_MATCH',
        severity: AlertSeverity.HIGH,
        title: 'Anomalous Connection',
      } as any;

      prismaMock.alert.findMany.mockResolvedValue([]); // No similar alerts
      prismaMock.iOC.findFirst.mockResolvedValue({
        id: 'ioc_1',
        value: '198.51.100.99',
        label: 'MALICIOUS',
      });
      prismaMock.incident.create.mockResolvedValue({ id: 'inc_corr_1' });

      const incident = await correlationService.correlateAlert(mockAlert);

      expect(incident).toBeDefined();
      expect(prismaMock.incident.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          incidentType: 'CORRELATED_THREAT_GROUP',
          severity: AlertSeverity.HIGH,
        }),
      }));
      expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['alrt_1'] } },
        data: { incidentId: 'inc_corr_1', status: AlertStatus.ESCALATED },
      });
    });

    it('should include domain-linked activity in the alert correlation query', async () => {
      const mockAlert = {
        id: 'alrt_domain',
        organizationId: 'org_1',
        ipAddress: '10.0.0.8',
        domain: 'c2.example.com',
        category: 'THREAT_INTEL_MATCH',
        severity: AlertSeverity.HIGH,
        title: 'Domain-correlation test',
      } as any;

      prismaMock.alert.findMany.mockResolvedValue([
        { id: 'alrt_2', assetId: 'ast_2', domain: 'c2.example.com' },
      ]);
      prismaMock.iOC.findFirst.mockResolvedValue(null);
      prismaMock.incident.create.mockResolvedValue({ id: 'inc_domain_1' });

      await correlationService.correlateAlert(mockAlert);

      expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ domain: 'c2.example.com' }),
            ]),
          }),
        }),
      );
    });

    it('should avoid broad correlation when only a shared domain is observed without sufficient context', async () => {
      const mockAlert = {
        id: 'alrt_domain_low_context',
        organizationId: 'org_1',
        assetId: 'ast_new',
        ipAddress: '10.0.0.8',
        domain: 'c2.example.com',
        category: 'THREAT_INTEL_MATCH',
        severity: AlertSeverity.HIGH,
        title: 'Low-context domain activity',
      } as any;

      prismaMock.alert.findMany.mockResolvedValue([
        { id: 'alrt_2', assetId: 'ast_other', domain: 'c2.example.com' },
      ]);
      prismaMock.iOC.findFirst.mockResolvedValue(null);
      prismaMock.incident.create.mockResolvedValue({ id: 'inc_domain_neg_1' });

      const incident = await correlationService.correlateAlert(mockAlert);

      expect(incident).toBeNull();
      expect(prismaMock.incident.create).not.toHaveBeenCalled();
    });

    it('should not create a duplicate incident when a matching correlated incident already exists for the alert', async () => {
      const mockAlert = {
        id: 'alrt_existing',
        organizationId: 'org_1',
        assetId: 'ast_existing',
        userIdentity: 'tenant-admin@example.com',
        ipAddress: '198.51.100.20',
        domain: 'malware-command-control.net',
        category: 'AUTHENTICATION_ANOMALY',
        severity: AlertSeverity.CRITICAL,
        title: 'Existing correlated attack chain',
      } as any;

      prismaMock.alert.findMany.mockResolvedValue([]);
      prismaMock.iOC.findFirst.mockResolvedValue(null);
      prismaMock.incident.findMany.mockResolvedValue([
        {
          id: 'inc_existing',
          organizationId: 'org_1',
          incidentType: 'CORRELATED_THREAT_GROUP',
          status: IncidentStatus.INVESTIGATING,
          alerts: [
            { id: 'alrt_existing', assetId: 'ast_existing', userIdentity: 'tenant-admin@example.com', ipAddress: '198.51.100.20', domain: 'malware-command-control.net' },
            { id: 'alrt_companion', assetId: 'ast_existing', userIdentity: 'tenant-admin@example.com', ipAddress: '198.51.100.20', domain: 'malware-command-control.net' },
          ],
        },
      ]);

      const incident = await correlationService.correlateAlert(mockAlert);

      expect(incident).toBeDefined();
      expect(incident?.id).toBe('inc_existing');
      expect(prismaMock.incident.create).not.toHaveBeenCalled();
    });

    it('should trigger lateral movement pattern escalation when 3 distinct assets trigger alerts within 1 hour', async () => {
      const mockAlert = {
        id: 'alrt_new',
        organizationId: 'org_1',
        ipAddress: '10.0.0.5',
        assetId: 'ast_new',
        severity: AlertSeverity.HIGH,
        category: 'AUTHENTICATION_ANOMALY',
      } as any;

      // Mock two other alerts on different assets within the window
      prismaMock.alert.findMany.mockResolvedValue([
        { id: 'alrt_2', assetId: 'ast_2' },
        { id: 'alrt_3', assetId: 'ast_3' },
      ]);
      prismaMock.iOC.findFirst.mockResolvedValue(null);
      prismaMock.incident.create.mockResolvedValue({ id: 'inc_lateral_1' });

      const incident = await correlationService.correlateAlert(mockAlert);

      expect(incident).toBeDefined();
      expect(prismaMock.incident.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: 'Correlated Security Incident: Multi-Asset Threat Group',
        }),
      }));
    });
  });
});
