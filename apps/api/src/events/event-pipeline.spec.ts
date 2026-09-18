import { EventPipelineService } from './event-pipeline.service.js';
import { CorrelationService } from '../queues/correlation.service.js';

describe('EventPipelineService (Canonical Domain Engine)', () => {
  let pipeline: EventPipelineService;
  let prismaMock: any;
  let correlationMock: any;

  beforeEach(() => {
    prismaMock = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-test', name: 'Test Org' }),
      },
      asset: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'asset-new',
          hostname: 'prod-srv-01',
          organizationId: 'org-test',
          riskScore: 35.0,
          activeAlertCount: 0,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'asset-new',
          riskScore: 35.0,
          activeAlertCount: 0,
          vulnerabilityCount: 1,
        }),
        update: jest.fn().mockResolvedValue({ id: 'asset-new' }),
      },
      securityEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'sec-evt-1',
          organizationId: 'org-test',
          eventType: 'BRUTE_FORCE_SSH',
          source: 'SSH_AUTH',
          action: 'LOGON',
          outcome: 'FAILURE',
          severity: 'HIGH',
          message: 'Failed login for root',
        }),
      },
      detectionRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rule-ssh',
            organizationId: 'org-test',
            name: 'SSH Brute Force Attempt',
            category: 'AUTHENTICATION_ANOMALY',
            severity: 'HIGH',
            isEnabled: true,
            matchConditions: {},
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'rule-ssh' }),
      },
      alert: {
        create: jest.fn().mockResolvedValue({
          id: 'alert-ssh-1',
          organizationId: 'org-test',
          title: 'Detection: SSH Brute Force Attempt',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'HIGH',
          assetId: 'asset-new',
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'alert-ssh-1',
          organizationId: 'org-test',
          title: 'Detection: SSH Brute Force Attempt',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'HIGH',
          assetId: 'asset-new',
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      incident: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'inc-ssh-1',
          title: 'Security Incident: SSH Brute Force Attempt',
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    correlationMock = {
      correlateAlert: jest.fn().mockResolvedValue({
        id: 'inc-ssh-1',
        title: 'Correlated Incident',
      }),
    };

    pipeline = new EventPipelineService(prismaMock, correlationMock);
  });

  it('executes full pipeline: registers asset, persists event, triggers rule, correlates incident, and recalculates asset risk', async () => {
    const result = await pipeline.processEvent({
      organizationId: 'org-test',
      input: {
        eventType: 'BRUTE_FORCE_SSH',
        source: 'SSH_AUTH',
        action: 'LOGON',
        outcome: 'FAILURE',
        severity: 'HIGH',
        message: 'Failed login for root',
        hostname: 'prod-srv-01',
        metadata: { ipAddress: '192.168.1.100' },
      },
      actor: { fullName: 'Test Ingest' },
      context: { requestId: 'req-123' },
    });

    expect(prismaMock.asset.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.securityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.alert.create).toHaveBeenCalledTimes(1);
    expect(correlationMock.correlateAlert).toHaveBeenCalledTimes(1);
    expect(prismaMock.asset.update).toHaveBeenCalledTimes(1);
    expect(result.alertsCreated).toHaveLength(1);
    expect(result.incidentsCreated).toHaveLength(1);
    expect(result.deduplicated).toBe(false);
  });

  it('deduplicates recent identical events within sliding window without generating alerts', async () => {
    prismaMock.securityEvent.findFirst.mockResolvedValueOnce({
      id: 'existing-evt-id',
      organizationId: 'org-test',
      message: 'Failed login for root',
    });

    const result = await pipeline.processEvent({
      organizationId: 'org-test',
      input: {
        eventType: 'BRUTE_FORCE_SSH',
        source: 'SSH_AUTH',
        action: 'LOGON',
        outcome: 'FAILURE',
        message: 'Failed login for root',
      },
    });

    expect(result.deduplicated).toBe(true);
    expect(result.storedEvent.id).toBe('existing-evt-id');
    expect(prismaMock.securityEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.alert.create).not.toHaveBeenCalled();
    expect(result.alertsCreated).toHaveLength(0);
  });

  it('evaluates operator conditions and records matched evidence', async () => {
    prismaMock.detectionRule.findMany.mockResolvedValueOnce([
      {
        id: 'rule-powershell',
        organizationId: 'org-test',
        name: 'PowerShell Execution',
        category: 'ENDPOINT_ANOMALY',
        severity: 'HIGH',
        isEnabled: true,
        matchConditions: {
          eventType: { operator: 'EQUALS', value: 'PROCESS_EXECUTION' },
          metadata: {
            processName: { operator: 'ENDS_WITH', value: '.exe' },
            confidence: { operator: 'GREATER_THAN', value: 70 },
          },
        },
      },
    ]);

    await pipeline.processEvent({
      organizationId: 'org-test',
      input: {
        eventType: 'PROCESS_EXECUTION',
        source: 'EDR',
        severity: 'HIGH',
        message: 'PowerShell execution',
        metadata: {
          processName: 'powershell.exe',
          confidence: 85,
        },
      },
    });

    expect(prismaMock.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rawEvent: expect.objectContaining({
            matchedEvidence: {
              eventType: 'PROCESS_EXECUTION',
              metadata: {
                processName: 'powershell.exe',
                confidence: 85,
              },
            },
          }),
        }),
      }),
    );
  });
});
