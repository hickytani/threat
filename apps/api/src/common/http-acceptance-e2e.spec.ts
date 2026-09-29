import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../app.module.js';
import { PrismaService } from '../common/prisma.service.js';
import { IngestionCredentialService } from '../ingestion/ingestion-credential.service.js';
import { AlertSeverity, IncidentStatus } from '@prisma/client';

describe('Real HTTP Acceptance & Security End-to-End Test Suite', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantAToken: string;
  let tenantBToken: string;
  let ingestionTokenA: string;
  let ingestionTokenB: string;
  let orgAId: string;
  let orgBId: string;

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'threatsync_super_secret_access_token_key_12345';
    process.env.JWT_REFRESH_SECRET = 'threatsync_super_secret_refresh_token_key_67890';
    process.env.SESSION_SECRET = 'threatsync_super_secret_session_key_revalation_98765';
    process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    const ingestionCredentialService = moduleFixture.get<IngestionCredentialService>(IngestionCredentialService);

    const uniqueSuffix = Date.now().toString(36);

    // 2. Real API Registration to get fully bound DB sessions & tokens
    const regARes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `analyst_a_${uniqueSuffix}@threatsync.local`,
        password: 'Password123!',
        fullName: 'Analyst Tenant A',
        organizationName: `Tenant Alpha ${uniqueSuffix}`,
      });

    orgAId = regARes.body.organization?.id;
    userAId = regARes.body.user?.id;

    const extractCookie = (res: any, cookieName: string): string => {
      const cookies: string[] = res.headers['set-cookie'] || [];
      const cookieStr = cookies.find((c: string) => c.startsWith(`${cookieName}=`));
      if (!cookieStr) return '';
      return cookieStr.split(';')[0].split('=')[1] || '';
    };

    const loginARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `analyst_a_${uniqueSuffix}@threatsync.local`,
        password: 'Password123!',
      });

    tenantAToken = extractCookie(loginARes, 'access_token');

    const regBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `analyst_b_${uniqueSuffix}@threatsync.local`,
        password: 'Password123!',
        fullName: 'Analyst Tenant B',
        organizationName: `Tenant Beta ${uniqueSuffix}`,
      });

    orgBId = regBRes.body.organization?.id;
    userBId = regBRes.body.user?.id;

    const loginBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `analyst_b_${uniqueSuffix}@threatsync.local`,
        password: 'Password123!',
      });

    tenantBToken = extractCookie(loginBRes, 'access_token');

    const credA = await ingestionCredentialService.create(orgAId, 'E2E Key A');
    ingestionTokenA = credA.token;

    const credB = await ingestionCredentialService.create(orgBId, 'E2E Key B');
    ingestionTokenB = credB.token;
  });

  afterAll(async () => {
    // Clean up test organizations
    if (orgAId) await prisma.organization.delete({ where: { id: orgAId } }).catch(() => {});
    if (orgBId) await prisma.organization.delete({ where: { id: orgBId } }).catch(() => {});
    if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});

    await app.close();
  });

  describe('1. Real HTTP Ingestion & Detection Lifecycle Pipeline', () => {
    it('ingests security event, triggers rule, creates alert, recalculates asset risk score & logs audit', async () => {
      // Create custom detection rule for Org A
      const rule = await prisma.detectionRule.create({
        data: {
          organizationId: orgAId,
          name: 'SSH Brute Force Attack',
          description: 'Detects high volume SSH authentication failures',
          category: 'AUTHENTICATION_ANOMALY',
          severity: 'HIGH',
          isEnabled: true,
          dataSource: 'AUTH_GATEWAY',
          queryDefinition: 'eventType == "SSH_LOGIN_FAILED" AND action == "AUTHENTICATE"',
          matchConditions: {
            eventType: 'SSH_LOGIN_FAILED',
            action: 'AUTHENTICATE',
          },
        },
      });

      // Ingest Event via HTTP API for Tenant A
      const ingestRes = await request(app.getHttpServer())
        .post('/api/v1/events/ingest')
        .set('Authorization', `Bearer ${ingestionTokenA}`)
        .send({
          eventType: 'SSH_LOGIN_FAILED',
          source: 'AuthGateway',
          action: 'AUTHENTICATE',
          outcome: 'FAILURE',
          severity: 'HIGH',
          hostname: 'prod-ssh-node-1',
          metadata: {
            sourceIp: '198.51.100.45',
            attemptCount: 15,
          },
        })
        .expect(200);

      expect(ingestRes.body.deduplicated).toBe(false);
      expect(ingestRes.body.alertsCreated).toHaveLength(1);
      expect(ingestRes.body.alertsCreated[0].ruleId).toBe(rule.id);

      // Verify Persisted DB State
      const storedEvent = await prisma.securityEvent.findFirst({
        where: { organizationId: orgAId, sourceIp: '198.51.100.45' },
      });
      expect(storedEvent).toBeDefined();

      const createdAlert = await prisma.alert.findFirst({
        where: { organizationId: orgAId, detectionRuleId: rule.id },
      });
      expect(createdAlert).toBeDefined();
      expect(createdAlert?.ipAddress).toBe('198.51.100.45');

      // Verify Risk Score Update on Auto-Discovered Asset
      const asset = await prisma.asset.findFirst({
        where: { organizationId: orgAId, hostname: 'prod-ssh-node-1' },
      });
      expect(asset).toBeDefined();
      expect(asset?.riskScore).toBeGreaterThan(35.0);

      // Verify Audit Log Persistence
      const auditLog = await prisma.auditLog.findFirst({
        where: { organizationId: orgAId, action: 'EVENT_INGESTION' },
      });
      expect(auditLog).toBeDefined();
    });

    it('deduplicates identical events within 5-minute sliding window', async () => {
      const payload = {
        eventType: 'MALWARE_EXECUTION_ATTEMPT',
        source: 'EDR-Agent',
        action: 'EXECUTE',
        outcome: 'BLOCKED',
        severity: 'CRITICAL',
        message: 'Ransomware executable blocked by host protection',
      };

      // Ingest First Time
      const firstRes = await request(app.getHttpServer())
        .post('/api/v1/events/ingest')
        .set('Authorization', `Bearer ${ingestionTokenA}`)
        .send(payload)
        .expect(200);

      expect(firstRes.body.deduplicated).toBe(false);

      // Ingest Second Time (Duplicate)
      const secondRes = await request(app.getHttpServer())
        .post('/api/v1/events/ingest')
        .set('Authorization', `Bearer ${ingestionTokenA}`)
        .send(payload)
        .expect(200);

      expect(secondRes.body.deduplicated).toBe(true);
      expect(secondRes.body.alertsCreated).toHaveLength(0);
    });

    it('does NOT cross-deduplicate identical events between different tenants', async () => {
      const sharedPayload = {
        eventType: 'SHARED_CROSS_TENANT_TEST',
        source: 'NetworkProbe',
        action: 'SCAN',
        outcome: 'DETECTED',
        severity: 'MEDIUM',
        message: 'Port scanning sweep observed',
      };

      // Tenant A Ingestion
      const resA = await request(app.getHttpServer())
        .post('/api/v1/events/ingest')
        .set('Authorization', `Bearer ${ingestionTokenA}`)
        .send(sharedPayload)
        .expect(200);

      expect(resA.body.deduplicated).toBe(false);

      // Tenant B Ingestion (Same Payload, Different Tenant Token)
      const resB = await request(app.getHttpServer())
        .post('/api/v1/events/ingest')
        .set('Authorization', `Bearer ${ingestionTokenB}`)
        .send(sharedPayload)
        .expect(200);

      expect(resB.body.deduplicated).toBe(false);
    });
  });

  describe('2. Real HTTP Tenant Isolation Attack Matrix', () => {
    let incidentAId: string;

    beforeAll(async () => {
      const incA = await prisma.incident.create({
        data: {
          organizationId: orgAId,
          title: 'Tenant A Sensitive Incident',
          summary: 'Confidential threat investigation in Org A',
          severity: AlertSeverity.HIGH,
          status: IncidentStatus.OPEN,
          incidentType: 'DATA_EXFILTRATION',
        },
      });
      incidentAId = incA.id;
    });

    it('prevents Tenant B from querying Tenant A incident (returns 404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/incidents/${incidentAId}`)
        .set('Authorization', `Bearer ${tenantBToken}`)
        .expect(404);
    });

    it('prevents Tenant B from updating Tenant A incident status (returns 404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/incidents/${incidentAId}`)
        .set('Authorization', `Bearer ${tenantBToken}`)
        .send({ status: 'CLOSED' })
        .expect(404);
    });

    it('prevents Tenant B from adding comments to Tenant A incident (returns 404)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/incidents/${incidentAId}/comments`)
        .set('Authorization', `Bearer ${tenantBToken}`)
        .send({ content: 'Unauthorized comment' })
        .expect(404);
    });

    it('prevents Tenant B from adding tasks to Tenant A incident (returns 404)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/incidents/${incidentAId}/tasks`)
        .set('Authorization', `Bearer ${tenantBToken}`)
        .send({ title: 'Malicious Task Injection' })
        .expect(404);
    });
  });

  describe('3. Real HTTP SSRF Defense Checks', () => {
    it('blocks notification policy creations targeting loopback and RFC1918 private IP destinations', async () => {
      const blockedUrls = [
        'http://127.0.0.1/webhook',
        'http://localhost:8080/webhook',
        'http://169.254.169.254/latest/meta-data/',
        'http://192.168.1.1/admin',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/api',
      ];

      for (const targetUrl of blockedUrls) {
        await request(app.getHttpServer())
          .post('/api/v1/notifications/policies')
          .set('Authorization', `Bearer ${tenantAToken}`)
          .send({
            name: 'Malicious SSRF Policy',
            channelType: 'WEBHOOK',
            destination: targetUrl,
            minSeverity: 'HIGH',
            isEnabled: true,
          })
          .expect(400);
      }
    });

    it('blocks non-HTTP protocols (file://, gopher://, ftp://)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/policies')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          name: 'Arbitrary File Protocol Policy',
          channelType: 'WEBHOOK',
          destination: 'file:///etc/passwd',
          minSeverity: 'HIGH',
          isEnabled: true,
        })
        .expect(400);
    });
  });

  describe('4. Secret Protection & API Hardening', () => {
    it('encrypts integration secret at rest and omits secret from HTTP GET responses', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/integrations')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          name: 'Custom EDR Webhook Provider',
          type: 'WEBHOOK',
        })
        .expect(201);

      expect(createRes.body.secretToken).toBeDefined();

      // Fetch integration list via GET - verify secret & encryptedCredentials are omitted from responses
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/integrations')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .expect(200);

      const item = listRes.body.find((i: any) => i.id === createRes.body.id);
      expect(item).toBeDefined();
      expect(item.secretToken).toBeUndefined();
      expect(item.encryptedCredentials).toBeUndefined();
    });

    it('executes manual telemetry synchronization for CloudTrail connector via HTTP API and enforces tenant isolation', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/integrations')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          name: 'AWS CloudTrail Production Audit',
          type: 'AWS_CLOUDTRAIL',
          configuration: { awsRegion: 'us-east-1' },
        })
        .expect(201);

      const integrationId = createRes.body.id;

      // Prevent Tenant B from triggering manual sync for Tenant A integration (returns 404)
      await request(app.getHttpServer())
        .post(`/api/v1/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${tenantBToken}`)
        .expect(404);

      // Tenant A executes manual sync successfully
      const syncRes = await request(app.getHttpServer())
        .post(`/api/v1/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${tenantAToken}`)
        .expect(200);

      expect(syncRes.body.success).toBe(true);
      expect(syncRes.body.eventsDiscovered).toBe(2);
      expect(syncRes.body.eventsIngested).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Health API Endpoint Verification', () => {
    it('returns healthy database status & local queue fallback status via /api/v1/health/dependencies', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/dependencies')
        .expect(200);

      expect(res.body.status).toBeDefined();
      expect(res.body.dependencies.database).toBe('UP');
      expect(['UP', 'DOWN', 'UP (In-memory Fallback)'].some(s => res.body.dependencies.redis.includes(s))).toBe(true);
    });
  });
});
