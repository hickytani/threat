import { IncidentsService } from '../incidents/incidents.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { EventsService } from '../events/events.service.js';
import { IntelligenceService } from '../intelligence/intelligence.service.js';
import { AssetsService } from '../assets/assets.service.js';
import { VulnerabilitiesService } from '../vulnerabilities/vulnerabilities.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { IncidentStatus, AlertSeverity, AlertStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ─── Shared test fixtures ────────────────────────────────────────────────────

const org1 = 'org_alpha_11111111-1111-1111-1111-111111111111';
const org2 = 'org_beta_22222222-2222-2222-2222-222222222222';

const userOrg1 = {
  user: { id: 'usr_1', email: 'analyst1@org1.local', fullName: 'Analyst One' },
  member: { id: 'mem_1', userId: 'usr_1', organizationId: org1, role: 'SECURITY_ANALYST' },
};

const userOrg2 = {
  user: { id: 'usr_2', email: 'analyst2@org2.local', fullName: 'Analyst Two' },
  member: { id: 'mem_2', userId: 'usr_2', organizationId: org2, role: 'SECURITY_ANALYST' },
};

// ─── Helper: minimal incident Prisma mock ────────────────────────────────────

function buildIncidentPrismaMock(incidents: Record<string, any>) {
  return {
    incident: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const match = incidents[where.id];
        if (match && match.organizationId === where.organizationId) return Promise.resolve(match);
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue(Object.values(incidents)),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'inc_new', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: Object.keys(incidents)[0] || 'inc_x', ...data }),
      ),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit_1' }) },
    securityEvent: { findMany: jest.fn().mockResolvedValue([]) },
    iOC: { findMany: jest.fn().mockResolvedValue([]) },
    assetVulnerability: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    organizationMember: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 1: TENANT ISOLATION / IDOR
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 1 – Tenant Isolation / IDOR', () => {
  // ── 1a. Incidents ─────────────────────────────────────────────────────────

  it('Org2 cannot read Org1 incident by direct ID substitution', async () => {
    const mock = buildIncidentPrismaMock({
      inc_org1: {
        id: 'inc_org1', organizationId: org1, title: 'Org1 Secret',
        status: IncidentStatus.OPEN, alerts: [], tasks: [], comments: [], evidence: [],
      },
    });
    const svc = new IncidentsService(userOrg2 as any, mock as any);
    await expect(svc.findOne('inc_org1')).rejects.toThrow(NotFoundException);
  });

  it('Org1 incident list always injects organizationId filter', async () => {
    const mock = buildIncidentPrismaMock({});
    mock.incident.findMany = jest.fn().mockImplementation(({ where }: any) => {
      expect(where.organizationId).toBe(org1);
      return Promise.resolve([]);
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.findAll({});
    expect(mock.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: org1 }) }),
    );
  });

  it('Org2 cannot update Org1 incident', async () => {
    const mock = buildIncidentPrismaMock({
      inc_org1: { id: 'inc_org1', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg2 as any, mock as any);
    await expect(svc.update('inc_org1', { title: 'Hacked' })).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot add comment to Org1 incident', async () => {
    const mock = buildIncidentPrismaMock({
      inc_org1: { id: 'inc_org1', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg2 as any, mock as any);
    await expect(
      svc.addComment('inc_org1', 'Evil note', 'usr_2', 'Analyst Two', false),
    ).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot add task to Org1 incident', async () => {
    const mock = buildIncidentPrismaMock({
      inc_org1: { id: 'inc_org1', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg2 as any, mock as any);
    await expect(svc.addTask('inc_org1', { title: 'Evil task' })).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot add evidence to Org1 incident', async () => {
    const mock = buildIncidentPrismaMock({
      inc_org1: { id: 'inc_org1', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg2 as any, mock as any);
    await expect(
      svc.addEvidence('inc_org1', { fileName: 'evil.zip' }, 'usr_2', 'Analyst Two'),
    ).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot read Org1 incident timeline', async () => {
    const mock = buildIncidentPrismaMock({
      inc_org1: {
        id: 'inc_org1', organizationId: org1, status: IncidentStatus.OPEN,
        alerts: [], tasks: [], comments: [], evidence: [],
      },
    });
    const svc = new IncidentsService(userOrg2 as any, mock as any);
    await expect(svc.getTimeline('inc_org1')).rejects.toThrow(NotFoundException);
  });

  // ── 1b. Alerts ────────────────────────────────────────────────────────────

  it('Org2 cannot read Org1 alert detail', async () => {
    const mock = {
      alert: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.organizationId === org1 && where.id === 'alert_org1') {
            return Promise.resolve({ id: 'alert_org1', organizationId: org1, rawEvent: {}, detectionRuleId: null });
          }
          return Promise.resolve(null);
        }),
      },
      detectionRule: { findFirst: jest.fn().mockResolvedValue(null) },
      securityEvent: { findMany: jest.fn().mockResolvedValue([]) },
      iOC: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = new AlertsService(userOrg2 as any, mock as any);
    await expect(svc.findOne('alert_org1')).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot update Org1 alert — update is never called', async () => {
    const updateMock = jest.fn();
    const mock = {
      alert: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: updateMock,
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new AlertsService(userOrg2 as any, mock as any);
    await expect(svc.update('alert_org1', { status: AlertStatus.INVESTIGATING }))
      .rejects.toThrow(NotFoundException);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('Alert findAll always scopes to caller organizationId', async () => {
    const mock = {
      alert: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          expect(where.organizationId).toBe(org2);
          return Promise.resolve([]);
        }),
      },
    };
    const svc = new AlertsService(userOrg2 as any, mock as any);
    await svc.findAll({});
    expect(mock.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: org2 }) }),
    );
  });

  // ── 1c. Assets ────────────────────────────────────────────────────────────

  it('Org2 cannot read Org1 asset detail', async () => {
    const mock = {
      asset: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.organizationId === org1 && where.id === 'asset_org1') {
            return Promise.resolve({ id: 'asset_org1', organizationId: org1, ipAddress: '10.0.0.1', alerts: [], vulnerabilities: [] });
          }
          return Promise.resolve(null);
        }),
      },
    };
    const svc = new AssetsService(userOrg2 as any, mock as any);
    await expect(svc.findOne('asset_org1')).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot update Org1 asset — update is never called', async () => {
    const updateMock = jest.fn();
    const mock = {
      asset: { findFirst: jest.fn().mockResolvedValue(null), update: updateMock },
    };
    const svc = new AssetsService(userOrg2 as any, mock as any);
    await expect(svc.update('asset_org1', { hostname: 'hijacked' })).rejects.toThrow(NotFoundException);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('Org2 cannot delete Org1 asset — delete is never called', async () => {
    const deleteMock = jest.fn();
    const mock = {
      asset: { findFirst: jest.fn().mockResolvedValue(null), delete: deleteMock },
    };
    const svc = new AssetsService(userOrg2 as any, mock as any);
    await expect(svc.remove('asset_org1')).rejects.toThrow(NotFoundException);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  // ── 1d. IOCs ──────────────────────────────────────────────────────────────

  it('Org2 cannot read Org1 IOC by ID', async () => {
    const mock = {
      iOC: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.organizationId === org1 && where.id === 'ioc_org1') {
            return Promise.resolve({ id: 'ioc_org1', organizationId: org1, value: '1.2.3.4', type: 'IPV4', enrichments: [] });
          }
          return Promise.resolve(null);
        }),
      },
    };
    const svc = new IntelligenceService(userOrg2 as any, mock as any);
    await expect(svc.getIocDetail('ioc_org1')).rejects.toThrow(NotFoundException);
  });

  it('Org2 cannot read Org1 IOC via value fallback lookup path', async () => {
    const mock = {
      iOC: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          // org2 gets null for both id-based and value-based lookups
          if (where.organizationId === org2) return Promise.resolve(null);
          return Promise.resolve(null);
        }),
      },
    };
    const svc = new IntelligenceService(userOrg2 as any, mock as any);
    await expect(svc.getIocDetail('1.2.3.4')).rejects.toThrow(NotFoundException);
  });

  it('IOC list always scopes to caller organization', async () => {
    const mock = {
      iOC: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          expect(where.organizationId).toBe(org1);
          return Promise.resolve([]);
        }),
      },
    };
    const svc = new IntelligenceService(userOrg1 as any, mock as any);
    await svc.getIocs();
    expect(mock.iOC.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: org1 }) }),
    );
  });

  // ── 1e. Vulnerabilities ───────────────────────────────────────────────────

  it('Org2 cannot update Org1 asset-vulnerability mapping', async () => {
    const updateMock = jest.fn();
    const mock = {
      assetVulnerability: { findFirst: jest.fn().mockResolvedValue(null), update: updateMock },
      asset: { update: jest.fn() },
    };
    const svc = new VulnerabilitiesService(userOrg2 as any, mock as any);
    await expect(svc.updateAssetVulnerability('av_org1', { status: 'REMEDIATED' }))
      .rejects.toThrow(NotFoundException);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('Asset vulnerability query always scopes by organization', async () => {
    const mock = {
      assetVulnerability: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          expect(where.asset.organizationId).toBe(org1);
          return Promise.resolve([]);
        }),
      },
    };
    const svc = new VulnerabilitiesService(userOrg1 as any, mock as any);
    await svc.getAssetVulnerabilities();
    expect(mock.assetVulnerability.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ asset: { organizationId: org1 } }),
      }),
    );
  });

  // ── 1f. Events ────────────────────────────────────────────────────────────

  it('Org2 cannot read Org1 event by direct ID', async () => {
    const mock = {
      securityEvent: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.organizationId === org1 && where.id === 'evt_org1') {
            return Promise.resolve({ id: 'evt_org1', organizationId: org1 });
          }
          return Promise.resolve(null);
        }),
      },
    };
    const svc = new EventsService(userOrg2 as any, mock as any);
    await expect(svc.findOne('evt_org1')).rejects.toThrow(NotFoundException);
  });

  it('Event search always filters by organizationId', async () => {
    const mock = {
      securityEvent: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          expect(where.organizationId).toBe(org2);
          return Promise.resolve([]);
        }),
      },
    };
    const svc = new EventsService(userOrg2 as any, mock as any);
    await svc.search({ ipAddress: '10.0.0.1' });
    expect(mock.securityEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: org2 }) }),
    );
  });

  // ── 1g. TenantScopedRepository guard ─────────────────────────────────────

  it('TenantScopedRepository throws when organizationId is empty string', () => {
    const req = {
      user: { id: 'usr_1', email: 'x@y.com', fullName: 'X' },
      member: { id: 'mem_1', userId: 'usr_1', organizationId: '', role: 'SECURITY_ANALYST' },
    };
    const repo = new TenantScopedRepository(req as any, {} as any);
    expect(() => repo.organizationId).toThrow('active organization context');
  });

  it('TenantScopedRepository throws when member context is absent', () => {
    const req = { user: { id: 'usr_1', email: 'x@y.com', fullName: 'X' } };
    const repo = new TenantScopedRepository(req as any, {} as any);
    expect(() => repo.organizationId).toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 2: INCIDENT LIFECYCLE STATE MACHINE INTEGRITY
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 2 – Incident Lifecycle Integrity', () => {
  it('Valid OPEN → TRIAGED transition is accepted and audit logged', async () => {
    const mock = buildIncidentPrismaMock({
      inc_100: { id: 'inc_100', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    const result = await svc.update('inc_100', { status: IncidentStatus.TRIAGED });
    expect(result.status).toBe(IncidentStatus.TRIAGED);
    expect(mock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'INCIDENT_STATUS_TRANSITION',
          previousValues: { status: IncidentStatus.OPEN },
          newValues: { status: IncidentStatus.TRIAGED },
        }),
      }),
    );
  });

  it('Invalid direct OPEN → RESOLVED transition is rejected with BadRequestException', async () => {
    const mock = buildIncidentPrismaMock({
      inc_100: { id: 'inc_100', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await expect(svc.update('inc_100', { status: IncidentStatus.RESOLVED })).rejects.toThrow(BadRequestException);
  });

  it('Invalid OPEN → MONITORING transition is rejected', async () => {
    const mock = buildIncidentPrismaMock({
      inc_100: { id: 'inc_100', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await expect(svc.update('inc_100', { status: IncidentStatus.MONITORING })).rejects.toThrow(BadRequestException);
  });

  it('No-op update (status unchanged) does NOT emit audit entry', async () => {
    const mock = buildIncidentPrismaMock({
      inc_same: { id: 'inc_same', organizationId: org1, status: IncidentStatus.OPEN },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.update('inc_same', { status: IncidentStatus.OPEN });
    expect(mock.auditLog.create).not.toHaveBeenCalled();
  });

  it('Valid TRIAGED → INVESTIGATING transition is accepted', async () => {
    const mock = buildIncidentPrismaMock({
      inc_t: { id: 'inc_t', organizationId: org1, status: IncidentStatus.TRIAGED },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    const result = await svc.update('inc_t', { status: IncidentStatus.INVESTIGATING });
    expect(result.status).toBe(IncidentStatus.INVESTIGATING);
  });

  it('Valid RESOLVED → CLOSED transition is accepted', async () => {
    const mock = buildIncidentPrismaMock({
      inc_r: { id: 'inc_r', organizationId: org1, status: IncidentStatus.RESOLVED },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    const result = await svc.update('inc_r', { status: IncidentStatus.CLOSED });
    expect(result.status).toBe(IncidentStatus.CLOSED);
  });

  it('Invalid CONTAINED → INVESTIGATING transition is rejected', async () => {
    const mock = buildIncidentPrismaMock({
      inc_c: { id: 'inc_c', organizationId: org1, status: IncidentStatus.CONTAINED },
    });
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await expect(svc.update('inc_c', { status: IncidentStatus.INVESTIGATING })).rejects.toThrow(BadRequestException);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 3: MASS ASSIGNMENT PROTECTION
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 3 – Mass Assignment Protection', () => {
  it('Incident update payload never contains organizationId', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inc_100', ...data }),
    );
    const mock = {
      incident: {
        findFirst: jest.fn().mockResolvedValue({ id: 'inc_100', organizationId: org1, status: IncidentStatus.OPEN }),
        update: capturedUpdate,
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.update('inc_100', {
      title: 'Legit Title',
      status: IncidentStatus.TRIAGED,
      organizationId: org2,   // Mass assignment attempt
    });
    const payload = capturedUpdate.mock.calls[0][0].data;
    expect(payload).not.toHaveProperty('organizationId');
  });

  it('Incident update ignores dangerous fields: passwordHash, riskScore, isActive', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inc_100', ...data }),
    );
    const mock = {
      incident: {
        findFirst: jest.fn().mockResolvedValue({ id: 'inc_100', organizationId: org1, status: IncidentStatus.OPEN }),
        update: capturedUpdate,
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.update('inc_100', {
      title: 'Legit',
      passwordHash: 'abc123',
      riskScore: 0,
      isActive: false,
    });
    const payload = capturedUpdate.mock.calls[0][0].data;
    expect(payload).not.toHaveProperty('passwordHash');
    expect(payload).not.toHaveProperty('riskScore');
    expect(payload).not.toHaveProperty('isActive');
  });

  it('Alert update payload never contains organizationId, title, or rawEvent', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'alert_1', ...data }),
    );
    const mock = {
      alert: {
        findFirst: jest.fn().mockResolvedValue({ id: 'alert_1', organizationId: org1, status: AlertStatus.NEW, assetId: null }),
        update: capturedUpdate,
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new AlertsService(userOrg1 as any, mock as any);
    await svc.update('alert_1', {
      status: AlertStatus.INVESTIGATING,
      organizationId: org2,
      title: 'Overwrite',
      rawEvent: { evil: true },
    });
    const payload = capturedUpdate.mock.calls[0][0].data;
    expect(payload).not.toHaveProperty('organizationId');
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('rawEvent');
    expect(payload.status).toBe(AlertStatus.INVESTIGATING);
  });

  it('Asset update payload never contains organizationId, riskScore, activeAlertCount', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'asset_1', ...data }),
    );
    const mock = {
      asset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asset_1', organizationId: org1 }),
        update: capturedUpdate,
      },
    };
    const svc = new AssetsService(userOrg1 as any, mock as any);
    await svc.update('asset_1', {
      hostname: 'valid-host',
      organizationId: org2,
      riskScore: 0,
      activeAlertCount: 0,
      vulnerabilityCount: 0,
    });
    const payload = capturedUpdate.mock.calls[0][0].data;
    expect(payload).not.toHaveProperty('organizationId');
    expect(payload).not.toHaveProperty('riskScore');
    expect(payload).not.toHaveProperty('activeAlertCount');
    expect(payload).not.toHaveProperty('vulnerabilityCount');
    expect(payload.hostname).toBe('valid-host');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 4: PAGINATION & INPUT VALIDATION
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 4 – Pagination & Input Validation', () => {
  it('Event search caps pageSize at 100 regardless of requested value', async () => {
    const mock = {
      securityEvent: {
        count: jest.fn().mockResolvedValue(1000),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const svc = new EventsService(userOrg1 as any, mock as any);
    await svc.search({ pageSize: 9999 });
    expect(mock.securityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('Event search uses page 1 for negative page values', async () => {
    const mock = {
      securityEvent: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new EventsService(userOrg1 as any, mock as any);
    await svc.search({ page: -100 });
    expect(mock.securityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });

  it('Event search returns correct pagination metadata across pages', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `evt_${i}`, organizationId: org1 }));
    const mock = {
      securityEvent: {
        count: jest.fn().mockResolvedValue(25),
        findMany: jest.fn().mockImplementation(({ skip, take }: any) =>
          Promise.resolve(items.slice(skip, skip + take)),
        ),
      },
    };
    const svc = new EventsService(userOrg1 as any, mock as any);
    const result = await svc.search({ page: 2, pageSize: 10 });
    expect(result.data).toHaveLength(10);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.total).toBe(25);
  });

  it('Non-numeric page value defaults to page 1 with skip=0', async () => {
    const mock = {
      securityEvent: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new EventsService(userOrg1 as any, mock as any);
    await svc.search({ page: 'abc' as any });
    expect(mock.securityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 5: CROSS-TENANT ASSIGNEE INJECTION
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 5 – Cross-Tenant Assignee Injection', () => {
  it('Incident creation always stamps caller organizationId — body organizationId ignored', async () => {
    const capturedCreate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inc_new', ...data }),
    );
    const mock = {
      incident: { create: capturedCreate, update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.create({ title: 'Test Incident', organizationId: org2 }, 'usr_1', 'Analyst One');
    const payload = capturedCreate.mock.calls[0][0].data;
    expect(payload.organizationId).toBe(org1);
    expect(payload.organizationId).not.toBe(org2);
  });

  it('Alert createIncident stamps service organizationId — not from alert body', async () => {
    const capturedCreate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inc_from_alert', ...data }),
    );
    const mock = {
      alert: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'alert_1', organizationId: org1, title: 'Test Alert',
          description: 'Desc', category: 'THREAT_INTEL_MATCH', severity: 'HIGH',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      incident: { create: capturedCreate },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const svc = new AlertsService(userOrg1 as any, mock as any);
    await svc.createIncident('alert_1', 'usr_1', 'Analyst One');
    const payload = capturedCreate.mock.calls[0][0].data;
    expect(payload.organizationId).toBe(org1);
  });

  it('Alert assignment with unknown userId sets analyst name to null (no cross-org data leak)', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'alert_1', ...data }),
    );
    const mock = {
      alert: {
        findFirst: jest.fn().mockResolvedValue({ id: 'alert_1', organizationId: org1, status: AlertStatus.NEW, assetId: null }),
        update: capturedUpdate,
      },
      // After fix: uses org-scoped membership lookup, not global user lookup
      organizationMember: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new AlertsService(userOrg1 as any, mock as any);
    await svc.update('alert_1', { assignedAnalystId: 'usr_2' });
    const payload = capturedUpdate.mock.calls[0][0].data;
    expect(payload.assignedAnalystName).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 6: AUDIT LOG INTEGRITY
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 6 – Audit Log Integrity', () => {
  it('Status transition audit record contains correct org, actor, and transition details', async () => {
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit_1' });
    const mock = {
      incident: {
        findFirst: jest.fn().mockResolvedValue({ id: 'inc_200', organizationId: org1, status: IncidentStatus.OPEN }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'inc_200', ...data })),
      },
      auditLog: { create: auditCreate },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.update('inc_200', { status: IncidentStatus.TRIAGED });
    expect(auditCreate).toHaveBeenCalledTimes(1);
    const auditData = auditCreate.mock.calls[0][0].data;
    expect(auditData.organizationId).toBe(org1);
    expect(auditData.actorId).toBe('usr_1');
    expect(auditData.actorEmail).toBe('analyst1@org1.local');
    expect(auditData.action).toBe('INCIDENT_STATUS_TRANSITION');
  });

  it('Alert escalation emits audit log scoped to correct org with correct action', async () => {
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit_2' });
    const mock = {
      alert: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'alert_esc', organizationId: org1, title: 'Escalate Me',
          description: 'Desc', category: 'ENDPOINT_ANOMALY', severity: 'HIGH',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      incident: { create: jest.fn().mockResolvedValue({ id: 'inc_esc', organizationId: org1 }) },
      auditLog: { create: auditCreate },
    };
    const svc = new AlertsService(userOrg1 as any, mock as any);
    await svc.createIncident('alert_esc', 'usr_1', 'Analyst One');
    expect(auditCreate).toHaveBeenCalled();
    const auditData = auditCreate.mock.calls[0][0].data;
    expect(auditData.organizationId).toBe(org1);
    expect(auditData.action).toBe('ALERT_ESCALATION');
    expect(auditData.resourceId).toBe('alert_esc');
    expect(auditData.outcome).toBe('SUCCESS');
  });

  it('Incident creation emits audit log with INCIDENT_CREATED action and correct org', async () => {
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit_create' });
    const mock = {
      incident: {
        create: jest.fn().mockResolvedValue({ id: 'inc_created', organizationId: org1, title: 'New', severity: 'HIGH', status: IncidentStatus.OPEN }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: auditCreate },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.create({ title: 'New Incident', severity: 'HIGH' }, 'usr_1', 'Analyst One');
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: org1,
          action: 'INCIDENT_CREATED',
          resourceType: 'INCIDENT',
          outcome: 'SUCCESS',
        }),
      }),
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ATTACK CLASS 7: ORG-SCOPED ANALYST & TASK OWNER VALIDATION (fixes)
// ════════════════════════════════════════════════════════════════════════════

describe('Attack Class 7 – Org-Scoped Analyst & Task Owner Validation', () => {
  it('addTask rejects ownerId from a different organization', async () => {
    const mock = buildIncidentPrismaMock({
      inc_task: { id: 'inc_task', organizationId: org1, status: IncidentStatus.OPEN },
    });
    // Simulate org membership check: usr_2 (org2 user) is NOT a member of org1
    mock.organizationMember = {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        if (where.organizationId_userId.organizationId === org1 && where.organizationId_userId.userId === 'usr_2') {
          return Promise.resolve(null); // not a member
        }
        return Promise.resolve(null);
      }),
    } as any;

    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await expect(svc.addTask('inc_task', { title: 'Recon Task', ownerId: 'usr_2' }))
      .rejects.toThrow(BadRequestException);
  });

  it('addTask accepts ownerId from same organization', async () => {
    const incidentTaskCreateMock = jest.fn().mockResolvedValue({ id: 'task_new' });
    const mock = {
      ...buildIncidentPrismaMock({
        inc_task: { id: 'inc_task', organizationId: org1, status: IncidentStatus.OPEN },
      }),
      incidentTask: { create: incidentTaskCreateMock },
      organizationMember: {
        findUnique: jest.fn().mockResolvedValue({
          organizationId: org1,
          userId: 'usr_1',
          user: { fullName: 'Analyst One' },
        }),
      },
    };

    const svc = new IncidentsService(userOrg1 as any, mock as any);
    const task = await svc.addTask('inc_task', { title: 'Legitimate Task', ownerId: 'usr_1' });
    expect(task.id).toBe('task_new');
    expect(incidentTaskCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'usr_1', ownerName: 'Analyst One' }),
      }),
    );
  });

  it('Alert update with out-of-org assignedAnalystId resolves name to null (no cross-org disclosure)', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'alert_1', ...data }),
    );
    const mock = {
      alert: {
        findFirst: jest.fn().mockResolvedValue({ id: 'alert_1', organizationId: org1, status: AlertStatus.NEW, assetId: null }),
        update: capturedUpdate,
      },
      organizationMember: {
        findUnique: jest.fn().mockResolvedValue(null), // usr_2 not in org1
      },
    };
    const svc = new AlertsService(userOrg1 as any, mock as any);
    await svc.update('alert_1', { assignedAnalystId: 'usr_2' });
    const payload = capturedUpdate.mock.calls[0][0].data;
    // assignedAnalystName must be null — no org2 user name should leak
    expect(payload.assignedAnalystName).toBeNull();
  });

  it('Incident update with valid same-org assignee resolves correct name', async () => {
    const capturedUpdate = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inc_100', ...data }),
    );
    const mock = {
      incident: {
        findFirst: jest.fn().mockResolvedValue({ id: 'inc_100', organizationId: org1, status: IncidentStatus.OPEN }),
        update: capturedUpdate,
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      organizationMember: {
        findUnique: jest.fn().mockResolvedValue({
          organizationId: org1,
          userId: 'usr_1',
          user: { fullName: 'Analyst One' },
        }),
      },
    };
    const svc = new IncidentsService(userOrg1 as any, mock as any);
    await svc.update('inc_100', { assignedAnalystId: 'usr_1' });
    const payload = capturedUpdate.mock.calls[0][0].data;
    expect(payload.assignedAnalystName).toBe('Analyst One');
  });
});

