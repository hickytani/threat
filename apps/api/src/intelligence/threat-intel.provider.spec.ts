import { LocalThreatIntelProvider, ExternalThreatIntelProvider } from './threat-intel.provider.js';

describe('Threat Intel providers', () => {
  it('creates a deterministic local IOC result when the IOC is missing', async () => {
    const prismaMock = {
      iOC: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'ioc-123',
          organizationId: 'org-1',
          value: '198.51.100.10',
          type: 'IPV4',
          reputationScore: 72,
          label: 'SUSPICIOUS',
          country: 'US',
          asn: 'AS15169 Google LLC',
          associatedDomains: [],
          associatedFiles: [],
          detectionCount: 1,
          firstObserved: new Date('2026-01-01'),
          lastObserved: new Date('2026-01-01'),
        }),
      },
      iOCEnrichment: {
        create: jest.fn().mockResolvedValue({
          id: 'enrich-1',
          sourceName: 'Local Intelligence',
          confidence: 82,
          rawResponse: { provider: 'local' },
          cacheAge: 86400
        }),
      },
    };

    const provider = new LocalThreatIntelProvider(prismaMock as any);

    const result = await provider.investigate('org-1', '198.51.100.10', 'IPV4');

    expect(prismaMock.iOC.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.iOCEnrichment.create).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('local');
    expect(result.label).toBe('SUSPICIOUS');
    expect(result.status).toBe('available');
  });

  it('marks the external provider as unavailable when no provider is configured', async () => {
    const provider = new ExternalThreatIntelProvider();

    const result = await provider.investigate('198.51.100.10', 'IPV4');

    expect(result.status).toBe('unavailable');
    expect(result.provider).toBe('external');
    expect(result.reason).toContain('not configured');
  });
});
