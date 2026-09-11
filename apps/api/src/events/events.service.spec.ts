import { EventsService } from './events.service.js';
import { AssetsService } from '../assets/assets.service.js';

describe('EventsService', () => {
  it('normalizes a raw event and creates a matching alert when a detection rule matches', async () => {
    const prismaMock = {
      securityEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'evt-1',
          organizationId: 'org-1',
          eventType: 'OKTA_AUTH_AUDIT',
          source: 'OktaIDP',
          action: 'PROCESS_AUDIT',
          outcome: 'FAILURE',
          severity: 'MEDIUM',
          message: 'Failed login password challenge for administrator',
          rawJson: JSON.stringify({ eventType: 'OKTA_AUTH_AUDIT' }),
          timestamp: new Date('2026-01-01T00:00:00Z'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      detectionRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rule-1',
            organizationId: 'org-1',
            name: 'Brute Force Attempts on SSH Port',
            category: 'AUTHENTICATION_ANOMALY',
            severity: 'MEDIUM',
            isEnabled: true,
            dataSource: 'Linux SSH Service',
            queryDefinition: '',
            matchConditions: {},
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'rule-1' }),
      },
      asset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asset-1', hostname: 'dc-01', organizationId: 'org-1' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'asset-1',
          organizationId: 'org-1',
          riskScore: 10,
          activeAlertCount: 0,
          vulnerabilityCount: 2,
        }),
        update: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      },
      alert: {
        create: jest.fn().mockResolvedValue({
          id: 'alert-1',
          title: 'Authentication anomaly detected',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'MEDIUM',
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const service = new EventsService(
      { member: { organizationId: 'org-1' }, user: { id: 'user-1', fullName: 'Analyst' } } as any,
      prismaMock as any,
    );

    const result = await service.ingest({
      eventType: 'OKTA_AUTH_AUDIT',
      source: 'OktaIDP',
      action: 'PROCESS_AUDIT',
      outcome: 'FAILURE',
      message: 'Failed login password challenge for administrator',
      hostname: 'dc-01',
      metadata: { attemptCount: 8 },
    });

    expect(prismaMock.securityEvent.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.alert.create).toHaveBeenCalledTimes(1);
    expect(result.alertsCreated).toHaveLength(1);
    expect(result.alertsCreated[0].category).toBe('AUTHENTICATION_ANOMALY');
    expect(result.normalizedEvent.eventType).toBe('OKTA_AUTH_AUDIT');
  });

  it('preserves metadata-driven rule matches and enriches alerts with detection context', async () => {
    const prismaMock = {
      securityEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'evt-metadata',
          organizationId: 'org-1',
          eventType: 'OKTA_AUTH_AUDIT',
          source: 'OktaIDP',
          action: 'PROCESS_AUDIT',
          outcome: 'FAILURE',
          severity: 'MEDIUM',
          message: 'Failed login for tenant admin',
          rawJson: JSON.stringify({ eventType: 'OKTA_AUTH_AUDIT' }),
          timestamp: new Date('2026-01-01T00:00:00Z'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      detectionRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rule-metadata',
            organizationId: 'org-1',
            name: 'Suspicious tenant admin authentication',
            category: 'AUTHENTICATION_ANOMALY',
            severity: 'HIGH',
            isEnabled: true,
            dataSource: 'OktaIDP',
            queryDefinition: '',
            matchConditions: {
              eventType: 'OKTA_AUTH_AUDIT',
              source: 'OktaIDP',
              outcome: 'FAILURE',
              metadata: {
                userIdentity: 'tenant-admin@example.com',
              },
            },
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'rule-metadata' }),
      },
      asset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asset-1', hostname: 'dc-01', organizationId: 'org-1' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'asset-1',
          organizationId: 'org-1',
          riskScore: 10,
          activeAlertCount: 0,
          vulnerabilityCount: 2,
        }),
        update: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      },
      alert: {
        create: jest.fn().mockResolvedValue({
          id: 'alert-metadata',
          title: 'Suspicious tenant admin authentication',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'HIGH',
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-metadata' }),
      },
    };

    const service = new EventsService(
      { member: { organizationId: 'org-1' }, user: { id: 'user-1', fullName: 'Analyst' } } as any,
      prismaMock as any,
    );

    await service.ingest({
      eventType: 'OKTA_AUTH_AUDIT',
      source: 'OktaIDP',
      action: 'PROCESS_AUDIT',
      outcome: 'FAILURE',
      message: 'Failed login for tenant admin',
      hostname: 'dc-01',
      metadata: {
        userIdentity: 'tenant-admin@example.com',
        attemptCount: 6,
      },
    });

    expect(prismaMock.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detectionRuleId: 'rule-metadata',
          userIdentity: 'tenant-admin@example.com',
          confidenceScore: expect.any(Number),
          rawEvent: expect.objectContaining({
            matchedConditions: expect.objectContaining({
              metadata: expect.objectContaining({ userIdentity: 'tenant-admin@example.com' }),
            }),
          }),
        }),
      }),
    );
  });

  it('does not trigger a rule when threshold conditions are not met', async () => {
    const prismaMock = {
      securityEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'evt-2',
          organizationId: 'org-1',
          eventType: 'OKTA_AUTH_AUDIT',
          source: 'OktaIDP',
          action: 'PROCESS_AUDIT',
          outcome: 'FAILURE',
          severity: 'MEDIUM',
          message: 'Failed login challenge',
          rawJson: JSON.stringify({ eventType: 'OKTA_AUTH_AUDIT' }),
          timestamp: new Date('2026-01-01T00:00:00Z'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      detectionRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rule-threshold',
            organizationId: 'org-1',
            name: 'Credential stuffing threshold',
            category: 'AUTHENTICATION_ANOMALY',
            severity: 'HIGH',
            isEnabled: true,
            dataSource: 'OktaIDP',
            queryDefinition: '',
            matchConditions: {
              eventType: 'OKTA_AUTH_AUDIT',
              source: 'OktaIDP',
              outcome: 'FAILURE',
              minimumAttempts: 5,
            },
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'rule-threshold' }),
      },
      asset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asset-1', hostname: 'dc-01', organizationId: 'org-1' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'asset-1',
          organizationId: 'org-1',
          riskScore: 10,
          activeAlertCount: 0,
          vulnerabilityCount: 0,
        }),
        update: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      },
      alert: {
        create: jest.fn().mockResolvedValue({
          id: 'alert-2',
          title: 'Threshold rule matched',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'HIGH',
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-2' }),
      },
    };

    const service = new EventsService(
      { member: { organizationId: 'org-1' }, user: { id: 'user-1', fullName: 'Analyst' } } as any,
      prismaMock as any,
    );

    await service.ingest({
      eventType: 'OKTA_AUTH_AUDIT',
      source: 'OktaIDP',
      action: 'PROCESS_AUDIT',
      outcome: 'FAILURE',
      message: 'Failed login challenge',
      hostname: 'dc-01',
      metadata: { attemptCount: 2 },
    });

    expect(prismaMock.alert.create).not.toHaveBeenCalled();
  });

  it('returns explainable risk contributors derived from real asset evidence', async () => {
    const prismaMock = {
      asset: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asset-risk',
          organizationId: 'org-1',
          hostname: 'dc-01.threatsync.local',
          displayName: 'Domain Controller',
          businessCriticality: 'CRITICAL',
          riskScore: 64,
          activeAlertCount: 2,
          vulnerabilityCount: 1,
          alerts: [
            {
              id: 'alert-1',
              severity: 'HIGH',
              status: 'INVESTIGATING',
              incidentId: 'incident-1',
              rawEvent: {
                matchedIoc: { value: '198.51.100.99', label: 'MALICIOUS', score: 95 },
              },
            },
            {
              id: 'alert-2',
              severity: 'CRITICAL',
              status: 'NEW',
              incidentId: null,
              rawEvent: {},
            },
          ],
          vulnerabilities: [
            {
              cveId: 'CVE-2021-44228',
              vulnerability: { cvssScore: 10, severity: 'CRITICAL', title: 'Log4Shell' },
              status: 'OPEN',
            },
          ],
        }),
      },
      securityEvent: {
        findMany: jest.fn().mockResolvedValue([
          { timestamp: new Date(Date.now() - 60 * 60 * 1000), outcome: 'FAILURE' },
          { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), outcome: 'SUCCESS' },
        ]),
      },
    };

    const service = new AssetsService(
      { member: { organizationId: 'org-1' }, user: { id: 'user-1', fullName: 'Analyst' } } as any,
      prismaMock as any,
    );

    const result = await service.findOne('asset-risk');

    expect(result.riskSummary.score).toBeGreaterThanOrEqual(75);
    expect(result.riskSummary.contributors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'criticality' }),
        expect.objectContaining({ label: 'intelligence' }),
        expect.objectContaining({ label: 'vulnerabilities' }),
      ]),
    );
    expect(result.riskSummary.contributors[0].reason).toContain('criticality');
  });

  it('suppresses repeated detections for a rule that is still within its suppression window', async () => {
    const prismaMock = {
      securityEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'evt-3',
          organizationId: 'org-1',
          eventType: 'OKTA_AUTH_AUDIT',
          source: 'OktaIDP',
          action: 'PROCESS_AUDIT',
          outcome: 'FAILURE',
          severity: 'MEDIUM',
          message: 'Repeated failed login challenge',
          rawJson: JSON.stringify({ eventType: 'OKTA_AUTH_AUDIT' }),
          timestamp: new Date(),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      detectionRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rule-suppressed',
            organizationId: 'org-1',
            name: 'Repeated Authentication Failure Rule',
            category: 'AUTHENTICATION_ANOMALY',
            severity: 'HIGH',
            isEnabled: true,
            suppressionPeriod: 3600,
            lastTriggered: new Date(Date.now() - 60 * 1000),
            triggerCount: 9,
            dataSource: 'OktaIDP',
            queryDefinition: '',
            matchConditions: {},
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'rule-suppressed' }),
      },
      asset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asset-1', hostname: 'dc-01', organizationId: 'org-1' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'asset-1',
          organizationId: 'org-1',
          riskScore: 10,
          activeAlertCount: 0,
          vulnerabilityCount: 0,
        }),
        update: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      },
      alert: {
        create: jest.fn().mockResolvedValue({
          id: 'alert-3',
          title: 'Suppressed repeated alert',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'HIGH',
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-3' }),
      },
    };

    const service = new EventsService(
      { member: { organizationId: 'org-1' }, user: { id: 'user-1', fullName: 'Analyst' } } as any,
      prismaMock as any,
    );

    const result = await service.ingest({
      eventType: 'OKTA_AUTH_AUDIT',
      source: 'OktaIDP',
      action: 'PROCESS_AUDIT',
      outcome: 'FAILURE',
      message: 'Repeated failed login challenge',
      hostname: 'dc-01',
      metadata: { attemptCount: 4 },
    });

    expect(result.alertsCreated).toHaveLength(0);
    expect(prismaMock.alert.create).not.toHaveBeenCalled();
  });
});
