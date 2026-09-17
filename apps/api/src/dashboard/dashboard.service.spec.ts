import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../common/prisma.service';

describe('DashboardService Unit Tests', () => {
  let service: DashboardService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      alert: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([]),
      },
      incident: {
        count: jest.fn().mockResolvedValue(2),
      },
      asset: {
        aggregate: jest.fn().mockResolvedValue({ _count: { _all: 10 }, _avg: { riskScore: 45.5 } }),
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([
          { id: 'ast_1', hostname: 'host1', riskScore: 40, displayName: 'Host 1' },
        ]),
      },
      securityEvent: {
        count: jest.fn().mockResolvedValue(150),
        findFirst: jest.fn().mockResolvedValue({ id: 'evt_1', timestamp: new Date() }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'evt_1',
            timestamp: new Date(),
            eventType: 'ENDPOINT_ANOMALY',
            source: 'Sysmon',
            action: 'PROCESS_EXECUTION',
            outcome: 'SUCCESS',
            severity: 'HIGH',
            message: 'Suspicious process execution',
            sourceIp: '10.0.1.50',
            destinationIp: null,
            assetId: 'ast_1',
            metadata: {},
            rawJson: '{}',
          },
        ]),
        groupBy: jest.fn().mockResolvedValue([{ assetId: 'ast_1' }]),
      },
      auditLog: {
        count: jest.fn().mockResolvedValue(25),
      },
      ingestionCredential: {
        count: jest.fn().mockResolvedValue(3),
      },
      assetVulnerability: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should return summary metrics correctly', async () => {
    const res = await service.getSummary('org_1');
    expect(res.totalAlerts).toBe(5);
    expect(res.openIncidents).toBe(2);
    expect(res.monitoredAssets).toBe(10);
    expect(res.averageAssetRisk).toBe(45.5);
    expect(res.eventsReceived).toBe(150);
  });

  it('should return activity log with target resolution', async () => {
    const res = await service.getActivity('org_1');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('evt_1');
    expect(res[0].target).toBe('host1');
    expect(res[0].riskScore).toBe(40);
  });

  it('should calculate security posture metrics defensibly', async () => {
    const posture = await service.getPosture('org_1');
    expect(posture.overallScore).toBeGreaterThanOrEqual(0);
    expect(posture.overallScore).toBeLessThanOrEqual(100);
    expect(posture.controls).toHaveLength(6);
    expect(posture.controls[0].id).toBe('ASSET_INVENTORY_COVERAGE');
    expect(posture.controls[1].id).toBe('TELEMETRY_COVERAGE');
  });

  it('should return operational ingestion metrics', async () => {
    const res = await service.getIngestionMetrics('org_1');
    expect(res.totalEventsReceived).toBe(150);
    expect(res.deduplicatedEvents).toBe(25);
    expect(res.queueStatus).toBe('OPERATIONAL');
  });
});
