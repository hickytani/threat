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
});
