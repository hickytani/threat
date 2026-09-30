import { IntegrationsService } from './integrations.service.js';
import { GenericWebhookConnector } from './connectors/generic-webhook.connector.js';
import { AwsCloudTrailConnector } from './connectors/aws-cloudtrail.connector.js';
import { ConnectorFactory } from './connectors/connector.factory.js';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prismaMock: any;
  let eventPipelineMock: any;
  let connectorFactory: ConnectorFactory;

  beforeEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = 'integration-test-key-that-is-long-enough';
    prismaMock = {
      integration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      securityEvent: {
        count: jest.fn().mockResolvedValue(42),
      },
      alert: {
        count: jest.fn().mockResolvedValue(5),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'aud_1' }),
      },
      connectorSyncHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist_1' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'hist_1',
            integrationId: 'int_cloudtrail_01',
            organizationId: 'org_01',
            status: 'SUCCESS',
            startedAt: new Date(),
            eventsDiscovered: 2,
            eventsIngested: 2,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    eventPipelineMock = {
      processEvent: jest.fn().mockResolvedValue({
        normalizedEvent: {},
        storedEvent: { id: 'evt_123' },
        alertsCreated: [],
        incidentsCreated: [],
        deduplicated: false,
      }),
    };

    const webhookConnector = new GenericWebhookConnector();
    const awsConnector = new AwsCloudTrailConnector();
    connectorFactory = new ConnectorFactory(webhookConnector, awsConnector);

    service = new IntegrationsService(prismaMock, eventPipelineMock, connectorFactory);
  });

  afterEach(() => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
  });

  it('encrypts integration secrets at rest and never exposes them in sanitized responses', async () => {
    const created = {
      id: 'int_secure_01',
      organizationId: 'org_01',
      name: 'Secure Webhook',
      type: 'WEBHOOK',
      isEnabled: true,
      status: 'ACTIVE',
      configuration: { fieldMap: {} },
      encryptedCredentials: 'enc:v1:stored',
    };
    prismaMock.integration.create.mockResolvedValue(created);

    const result = await service.create('org_01', {
      name: 'Secure Webhook',
      type: 'WEBHOOK',
      configuration: { secret: 'caller-secret', fieldMap: {} },
    });

    const persisted = prismaMock.integration.create.mock.calls[0][0].data;
    expect(persisted.encryptedCredentials).toMatch(/^enc:v1:/);
    expect(persisted.encryptedCredentials).not.toContain('whsec_');
    expect(persisted.configuration.webhookSecret).toBeUndefined();
    expect(persisted.configuration.secret).toBeUndefined();
    expect(result.configuration.webhookSecret).toBeUndefined();
    expect(result.encryptedCredentials).toBeUndefined();
    expect(result.secretToken).toMatch(/^whsec_/);
  });

  it('normalizes incoming vendor webhook payload and passes to EventPipelineService', async () => {
    const mockIntegration = {
      id: 'int_wh_01',
      organizationId: 'org_01',
      name: 'Datadog Alert Webhook',
      type: 'WEBHOOK',
      isEnabled: true,
      status: 'ACTIVE',
      encryptedCredentials: 'whsec_valid_secret',
      configuration: {
        fieldMap: {
          eventType: 'alert_title',
          hostname: 'host_name',
          sourceIp: 'ip_address',
        },
      },
    };

    prismaMock.integration.findUnique.mockResolvedValue(mockIntegration);
    prismaMock.integration.update.mockResolvedValue({ ...mockIntegration, lastSync: new Date() });

    const result = await service.processWebhookIngestion({
      integrationId: 'int_wh_01',
      providedSecret: 'whsec_valid_secret',
      payload: {
        alert_title: 'High CPU Usage Detected',
        host_name: 'prod-api-server-01',
        ip_address: '10.0.1.50',
        message: 'CPU exceeded 95% threshold for 5m',
      },
    });

    expect(eventPipelineMock.processEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_01',
        input: expect.objectContaining({
          eventType: 'High CPU Usage Detected',
          hostname: 'prod-api-server-01',
          severity: 'MEDIUM',
        }),
      }),
    );
    expect(result.storedEvent.id).toBe('evt_123');
  });

  it('rejects webhook requests with invalid secret token and logs auth failure', async () => {
    const mockIntegration = {
      id: 'int_wh_01',
      organizationId: 'org_01',
      name: 'Custom Webhook',
      type: 'WEBHOOK',
      isEnabled: true,
      status: 'ACTIVE',
      encryptedCredentials: 'whsec_secret_123',
    };

    prismaMock.integration.findUnique.mockResolvedValue(mockIntegration);
    prismaMock.integration.update.mockResolvedValue(mockIntegration);

    await expect(
      service.processWebhookIngestion({
        integrationId: 'int_wh_01',
        providedSecret: 'wrong_secret',
        payload: { test: true },
      }),
    ).rejects.toThrow('Invalid webhook authentication secret');

    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          health: 'DEGRADED',
          lastErrorMessage: 'Invalid webhook authentication secret.',
        }),
      }),
    );
  });

  it('executes controlled test event through integration connector', async () => {
    const mockIntegration = {
      id: 'int_wh_02',
      organizationId: 'org_01',
      name: 'Test Endpoint',
      type: 'WEBHOOK',
      isEnabled: true,
      status: 'ACTIVE',
      configuration: {},
    };

    prismaMock.integration.findFirst.mockResolvedValue(mockIntegration);
    prismaMock.integration.update.mockResolvedValue(mockIntegration);

    const testRes = await service.testEvent('org_01', 'int_wh_02');

    expect(testRes.success).toBe(true);
    expect(testRes.eventsProcessed).toBe(1);
    expect(eventPipelineMock.processEvent).toHaveBeenCalled();
  });

  it('calculates metrics from real database queries', async () => {
    const mockIntegration = {
      id: 'int_wh_03',
      organizationId: 'org_01',
      name: 'Metrics Test',
      type: 'WEBHOOK',
      health: 'OK',
      status: 'ACTIVE',
      eventCount: 42,
      errorCount: 0,
    };

    prismaMock.integration.findFirst.mockResolvedValue(mockIntegration);

    const metrics = await service.getMetrics('org_01', 'int_wh_03');

    expect(metrics.totalEvents).toBe(42);
    expect(metrics.alertsGenerated).toBe(5);
    expect(metrics.health).toBe('OK');
  });

  it('executes manual telemetry synchronization for CloudTrail integration', async () => {
    const mockIntegration = {
      id: 'int_cloudtrail_01',
      organizationId: 'org_01',
      name: 'AWS CloudTrail Production',
      type: 'AWS_CLOUDTRAIL',
      isEnabled: true,
      status: 'ACTIVE',
      configuration: {
        awsRegion: 'us-east-1',
      },
    };

    prismaMock.integration.findFirst.mockResolvedValue(mockIntegration);
    prismaMock.integration.update.mockResolvedValue(mockIntegration);

    const syncRes = await service.syncIntegration('org_01', 'int_cloudtrail_01');

    expect(syncRes.success).toBe(true);
    expect(syncRes.eventsDiscovered).toBe(2);
    expect(syncRes.eventsIngested).toBe(2);
    expect(eventPipelineMock.processEvent).toHaveBeenCalledTimes(2);
    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int_cloudtrail_01' },
        data: expect.objectContaining({
          health: 'OK',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('retrieves sync history for an integration with pagination', async () => {
    const mockIntegration = {
      id: 'int_cloudtrail_01',
      organizationId: 'org_01',
    };
    prismaMock.integration.findFirst.mockResolvedValue(mockIntegration);

    const history = await service.getSyncHistory('org_01', 'int_cloudtrail_01', 1, 10);

    expect(history.total).toBe(1);
    expect(history.items.length).toBe(1);
    expect(history.items[0].id).toBe('hist_1');
    expect(prismaMock.connectorSyncHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { integrationId: 'int_cloudtrail_01', organizationId: 'org_01' },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 10,
      }),
    );
  });

  it('configures schedule and updates polling interval', async () => {
    const mockIntegration = {
      id: 'int_cloudtrail_01',
      organizationId: 'org_01',
      isScheduleEnabled: false,
      pollingIntervalMinutes: 15,
    };
    prismaMock.integration.findFirst.mockResolvedValue(mockIntegration);
    prismaMock.integration.update.mockResolvedValue({
      ...mockIntegration,
      isScheduleEnabled: true,
      pollingIntervalMinutes: 5,
      connectorStatus: 'READY',
    });

    const result = await service.configureSchedule('org_01', 'int_cloudtrail_01', {
      isScheduleEnabled: true,
      pollingIntervalMinutes: 5,
    });

    expect(result.isScheduleEnabled).toBe(true);
    expect(result.pollingIntervalMinutes).toBe(5);
    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int_cloudtrail_01' },
        data: expect.objectContaining({
          isScheduleEnabled: true,
          pollingIntervalMinutes: 5,
          connectorStatus: 'READY',
        }),
      }),
    );
  });
});
