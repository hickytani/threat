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
    delete process.env.VIRUSTOTAL_API_KEY;
    delete process.env.ABUSEIPDB_API_KEY;
    const provider = new ExternalThreatIntelProvider();

    const result = await provider.investigate('198.51.100.10', 'IPV4');

    expect(result.status).toBe('unavailable');
    expect(result.provider).toBe('external');
    expect(result.reason).toContain('not configured');
  });

  it('queries VirusTotal and AbuseIPDB when API keys are provided', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    process.env.ABUSEIPDB_API_KEY = 'abuse-fake-key';

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('virustotal')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({
            data: {
              attributes: {
                last_analysis_stats: { malicious: 80, suspicious: 10, harmless: 10 },
                country: 'US',
                asn: 15169,
                as_owner: 'GOOGLE',
              },
            },
          }),
        });
      }
      if (url.includes('abuseipdb')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({
            data: {
              abuseConfidenceScore: 92,
              countryCode: 'US',
              isp: 'Google LLC',
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as any;

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('8.8.8.8', 'IPV4');

      expect(result.status).toBe('available');
      expect(result.state).toBe('SUCCESS');
      expect(result.label).toBe('MALICIOUS');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.enrichments).toHaveLength(2);
      expect(result.enrichments?.[0].sourceName).toBe('VirusTotal v3');
      expect(result.enrichments?.[1].sourceName).toBe('AbuseIPDB v2');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
      delete process.env.ABUSEIPDB_API_KEY;
    }
  });

  it('handles VirusTotal domain and file hash observable lookups', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/domains/') || url.includes('/files/')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({
            data: { attributes: { last_analysis_stats: { malicious: 50, harmless: 50 } } },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    }) as any;

    try {
      const provider = new ExternalThreatIntelProvider();

      const domainRes = await provider.investigate('malicious.example.com', 'DOMAIN');
      expect(domainRes.status).toBe('available');
      expect(domainRes.enrichments?.[0].sourceName).toBe('VirusTotal v3');

      const hashRes = await provider.investigate('44d88612fea8a8f36de82e1278abb02f', 'HASH');
      expect(hashRes.status).toBe('available');
      expect(hashRes.enrichments?.[0].sourceName).toBe('VirusTotal v3');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });

  it('handles 401 / 403 unauthorized responses gracefully', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'invalid-key';
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
    });

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('8.8.8.8', 'IPV4');

      expect(result.status).toBe('unavailable');
      expect(result.state).toBe('UNAUTHORIZED');
      expect(result.reason).toContain('key rejected');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });

  it('handles 404 not found responses gracefully', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      ok: false,
    });

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('1.1.1.1', 'IPV4');

      expect(result.status).toBe('unavailable');
      expect(result.state).toBe('NOT_FOUND');
      expect(result.reason).toContain('not found');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });

  it('handles 429 rate limit responses gracefully', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockResolvedValue({
      status: 429,
      ok: false,
    });

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('8.8.8.8', 'IPV4');

      expect(result.status).toBe('unavailable');
      expect(result.state).toBe('RATE_LIMITED');
      expect(result.reason).toContain('rate limit');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });

  it('handles 500 server error responses gracefully', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      ok: false,
    });

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('8.8.8.8', 'IPV4');

      expect(result.status).toBe('unavailable');
      expect(result.state).toBe('ERROR');
      expect(result.reason).toContain('server error');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });

  it('handles timeout (AbortError) and network errors gracefully', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    const originalFetch = global.fetch;

    const timeoutErr = new Error('The operation was aborted');
    timeoutErr.name = 'AbortError';

    global.fetch = jest.fn().mockRejectedValue(timeoutErr);

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('8.8.8.8', 'IPV4');

      expect(result.status).toBe('unavailable');
      expect(result.state).toBe('TIMEOUT');
      expect(result.reason).toContain('timed out');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });

  it('handles malformed JSON response gracefully', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-fake-key';
    const originalFetch = global.fetch;

    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.reject(new Error('SyntaxError: Unexpected token')),
    });

    try {
      const provider = new ExternalThreatIntelProvider();
      const result = await provider.investigate('8.8.8.8', 'IPV4');

      expect(result.status).toBe('unavailable');
      expect(result.state).toBe('ERROR');
      expect(result.reason).toContain('malformed JSON');
    } finally {
      global.fetch = originalFetch;
      delete process.env.VIRUSTOTAL_API_KEY;
    }
  });
});


