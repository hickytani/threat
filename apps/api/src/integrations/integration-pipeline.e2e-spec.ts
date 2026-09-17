import { IntegrationsService } from './integrations.service.js';
import { EventPipelineService } from '../events/event-pipeline.service.js';
import { ConnectorFactory } from './connectors/connector.factory.js';
import { GenericWebhookConnector } from './connectors/generic-webhook.connector.js';
import { AwsCloudTrailConnector } from './connectors/aws-cloudtrail.connector.js';

describe('Phase 26 — Telemetry Ingestion End-to-End Acceptance Test', () => {
  let integrationsService: IntegrationsService;
  let eventPipelineService: EventPipelineService;

  let prismaMock: any;
  let correlationServiceMock: any;
  let notificationsServiceMock: any;

  beforeEach(() => {
    const store = {
      organizations: new Map<string, any>(),
      assets: new Map<string, any>(),
      detectionRules: new Map<string, any>(),
      securityEvents: [] as any[],
      alerts: [] as any[],
      incidents: [] as any[],
      auditLogs: [] as any[],
      integrations: new Map<string, any>(),
    };

    prismaMock = {
      organization: {
        findUnique: jest.fn(({ where }) => Promise.resolve(store.organizations.get(where.id) || { id: where.id })),
      },
      asset: {
        findFirst: jest.fn(({ where }) => {
          const list = Array.from(store.assets.values()).filter((a) => a.organizationId === where.organizationId && a.hostname === where.hostname);
          return Promise.resolve(list[0] || null);
        }),
        findUnique: jest.fn(({ where }) => Promise.resolve(store.assets.get(where.id) || null)),
        create: jest.fn(({ data }) => {
          const asset = { id: `asset_${Date.now()}`, ...data, riskScore: 35.0 };
          store.assets.set(asset.id, asset);
          return Promise.resolve(asset);
        }),
        update: jest.fn(({ where, data }) => {
          const asset = store.assets.get(where.id) || {};
          const updated = { ...asset, ...data };
          store.assets.set(where.id, updated);
          return Promise.resolve(updated);
        }),
      },
      detectionRule: {
        findMany: jest.fn(({ where }) => {
          const rules = Array.from(store.detectionRules.values()).filter((r) => r.organizationId === where.organizationId && r.isEnabled === where.isEnabled);
          return Promise.resolve(rules);
        }),
        update: jest.fn(({ where, data }) => {
          const rule = store.detectionRules.get(where.id) || {};
          const updated = { ...rule, ...data, triggerCount: (rule.triggerCount || 0) + (data.triggerCount?.increment || 1) };
          store.detectionRules.set(where.id, updated);
          return Promise.resolve(updated);
        }),
      },
      securityEvent: {
        create: jest.fn(({ data }) => {
          const event = { id: `evt_${Date.now()}_${Math.random()}`, ...data };
          store.securityEvents.push(event);
          return Promise.resolve(event);
        }),
        findFirst: jest.fn(() => Promise.resolve(null)),
        count: jest.fn(() => Promise.resolve(store.securityEvents.length)),
      },
      alert: {
        create: jest.fn(({ data }) => {
          const alert = { id: `alt_${Date.now()}_${Math.random()}`, ...data };
          store.alerts.push(alert);
          return Promise.resolve(alert);
        }),
        findUnique: jest.fn(({ where }) => Promise.resolve(store.alerts.find((a) => a.id === where.id) || null)),
        count: jest.fn(() => Promise.resolve(store.alerts.length)),
      },
      incident: {
        create: jest.fn(({ data }) => {
          const inc = { id: `inc_${Date.now()}`, ...data };
          store.incidents.push(inc);
          return Promise.resolve(inc);
        }),
      },
      auditLog: {
        create: jest.fn(({ data }) => {
          const log = { id: `aud_${Date.now()}`, ...data };
          store.auditLogs.push(log);
          return Promise.resolve(log);
        }),
      },
      integration: {
        create: jest.fn(({ data }) => {
          const integration = { id: `int_${Date.now()}`, ...data };
          store.integrations.set(integration.id, integration);
          return Promise.resolve(integration);
        }),
        findUnique: jest.fn(({ where }) => Promise.resolve(store.integrations.get(where.id) || null)),
        findFirst: jest.fn(({ where }) => {
          const list = Array.from(store.integrations.values()).filter((i) => i.organizationId === where.organizationId && (!where.id || i.id === where.id));
          return Promise.resolve(list[0] || null);
        }),
        update: jest.fn(({ where, data }) => {
          const existing = store.integrations.get(where.id) || {};
          const updated = { ...existing, ...data };
          store.integrations.set(where.id, updated);
          return Promise.resolve(updated);
        }),
        delete: jest.fn(({ where }) => {
          store.integrations.delete(where.id);
          return Promise.resolve({ id: where.id });
        }),
      },
      store, // reference for assertions
    };

    correlationServiceMock = {
      correlateAlert: jest.fn().mockImplementation(async (alert) => {
        if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
          const incident = {
            id: `inc_corr_${alert.id}`,
            title: `Correlated Incident for ${alert.title}`,
            severity: alert.severity,
          };
          prismaMock.store.incidents.push(incident);
          return incident;
        }
        return null;
      }),
    };

    notificationsServiceMock = {
      evaluateAndDispatchAlertNotifications: jest.fn().mockResolvedValue([]),
    };

    eventPipelineService = new EventPipelineService(
      prismaMock,
      correlationServiceMock,
      notificationsServiceMock,
    );

    const webhookConnector = new GenericWebhookConnector();
    const awsConnector = new AwsCloudTrailConnector();
    const connectorFactory = new ConnectorFactory(webhookConnector, awsConnector);

    integrationsService = new IntegrationsService(
      prismaMock,
      eventPipelineService,
      connectorFactory,
    );
  });

  it('completes the entire real-data telemetry ingestion lifecycle', async () => {
    const orgId = 'org_acceptance_test_01';

    // 1. Setup Detection Rule
    const rule = {
      id: 'rule_brute_force_01',
      organizationId: orgId,
      name: 'Unauthorized Admin Access',
      description: 'Detects unauthorized admin authentication attempts',
      category: 'AUTHENTICATION_ANOMALY',
      severity: 'HIGH',
      isEnabled: true,
      matchConditions: {
        eventType: 'UNAUTHORIZED_ADMIN_LOGIN',
      },
      suppressionPeriod: 0,
    };
    prismaMock.store.detectionRules.set(rule.id, rule);

    // 2. Create Webhook Integration
    const integration = await integrationsService.create(orgId, {
      name: 'Production Auth Webhook',
      type: 'WEBHOOK',
      configuration: {
        fieldMap: {
          eventType: 'event_name',
          hostname: 'host_name',
          sourceIp: 'client_ip',
        },
      },
    });

    expect(integration.secretToken).toBeDefined();
    const validSecret = integration.secretToken;
    const integrationId = integration.id;

    // 3. Send Real Telemetry Payload via Webhook
    const result = await integrationsService.processWebhookIngestion({
      integrationId,
      providedSecret: validSecret,
      payload: {
        event_name: 'UNAUTHORIZED_ADMIN_LOGIN',
        host_name: 'auth-cluster-01.internal',
        client_ip: '198.51.100.99',
        action: 'SSH_LOGIN',
        outcome: 'FAILURE',
        severity: 'HIGH',
        message: 'Invalid administrative password attempt',
      },
    });

    // 4. Verify Downstream Records
    expect(result.storedEvent).toBeDefined();
    expect(prismaMock.store.securityEvents).toHaveLength(1);
    expect(prismaMock.store.securityEvents[0].eventType).toBe('UNAUTHORIZED_ADMIN_LOGIN');

    // 5. Verify Detection & Alert Creation
    expect(result.alertsCreated).toHaveLength(1);
    expect(result.alertsCreated[0].title).toBe('Detection: Unauthorized Admin Access');

    // 6. Verify Correlation into Incident
    expect(result.incidentsCreated).toHaveLength(1);

    // 7. Verify Audit Log Execution
    expect(prismaMock.store.auditLogs.length).toBeGreaterThan(0);

    // 8. Secret Rotation Verification
    const rotationResult = await integrationsService.regenerateSecret(orgId, integrationId);
    const newSecret = rotationResult.secretToken;
    expect(newSecret).not.toEqual(validSecret);

    // Old secret must fail authentication
    await expect(
      integrationsService.processWebhookIngestion({
        integrationId,
        providedSecret: validSecret,
        payload: { event_name: 'TEST_EVENT' },
      }),
    ).rejects.toThrow('Invalid webhook authentication secret');

    // New secret must succeed
    const postRotationResult = await integrationsService.processWebhookIngestion({
      integrationId,
      providedSecret: newSecret,
      payload: { event_name: 'UNAUTHORIZED_ADMIN_LOGIN' },
    });
    expect(postRotationResult.storedEvent).toBeDefined();

    // 9. Integration Disabling Verification
    await integrationsService.update(orgId, integrationId, { isEnabled: false });

    await expect(
      integrationsService.processWebhookIngestion({
        integrationId,
        providedSecret: newSecret,
        payload: { event_name: 'DISABLED_TEST' },
      }),
    ).rejects.toThrow('disabled or disconnected');
  });
});
