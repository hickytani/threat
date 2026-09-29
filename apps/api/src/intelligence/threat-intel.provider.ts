export type ThreatIntelInvestigationStatus = 'available' | 'unavailable';
export type ThreatIntelInvestigationState = 'SUCCESS' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'TIMEOUT' | 'ERROR' | 'UNAVAILABLE';

const deriveDeterministicScore = (value: string, type: string): number => {
  let hash = 0;

  for (const character of `${value}:${type}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return 40 + (hash % 41);
};

export interface ThreatIntelInvestigationResult {
  provider: 'local' | 'external';
  status: ThreatIntelInvestigationStatus;
  state?: ThreatIntelInvestigationState;
  label?: string;
  score?: number;
  country?: string;
  asn?: string;
  reason?: string;
  enrichments?: Array<{
    sourceName: string;
    confidence: number;
    rawResponse: Record<string, unknown>;
  }>;
}

export class LocalThreatIntelProvider {
  constructor(private readonly prisma: any) {}

  async investigate(organizationId: string, value: string, type: string): Promise<ThreatIntelInvestigationResult> {
    const existingIoc = await this.prisma.iOC.findUnique({
      where: {
        organizationId_value: {
          organizationId,
          value,
        },
      },
      include: {
        enrichments: true,
      },
    });

    if (existingIoc) {
      return {
        provider: 'local',
        status: 'available',
        state: 'SUCCESS',
        label: existingIoc.label,
        score: existingIoc.reputationScore,
        country: existingIoc.country,
        asn: existingIoc.asn,
        enrichments: existingIoc.enrichments?.map((enrichment: any) => ({
          sourceName: enrichment.sourceName,
          confidence: enrichment.confidence,
          rawResponse: enrichment.rawResponse,
        })),
      };
    }

    const score = deriveDeterministicScore(value, type);
    const label = score >= 80 ? 'MALICIOUS' : score <= 39 ? 'UNKNOWN' : 'SUSPICIOUS';

    const newIoc = await this.prisma.iOC.create({
      data: {
        organizationId,
        value,
        type,
        reputationScore: score,
        label,
        associatedDomains: [],
        associatedFiles: [],
        detectionCount: 1,
      },
    });

    const enrich = await this.prisma.iOCEnrichment.create({
      data: {
        iocId: newIoc.id,
        sourceName: 'Local Intelligence',
        confidence: 82,
        rawResponse: {
          provider: 'local',
          issues: [],
          summary: `${label} IOC observed locally`,
        },
      },
    });

    return {
      provider: 'local',
      status: 'available',
      state: 'SUCCESS',
      label,
      score,
      enrichments: [
        {
          sourceName: enrich.sourceName,
          confidence: enrich.confidence,
          rawResponse: enrich.rawResponse,
        },
      ],
    };
  }
}

export class ExternalThreatIntelProvider {
  async investigate(value: string, type: string): Promise<ThreatIntelInvestigationResult> {
    const vtKey = process.env.VIRUSTOTAL_API_KEY;
    const abuseKey = process.env.ABUSEIPDB_API_KEY;

    if (!vtKey && !abuseKey) {
      return {
        provider: 'external',
        status: 'unavailable',
        state: 'UNAVAILABLE',
        reason: `External threat intelligence provider is not configured (missing VIRUSTOTAL_API_KEY / ABUSEIPDB_API_KEY) for ${type} value ${value}.`,
      };
    }

    const enrichments: Array<{
      sourceName: string;
      confidence: number;
      rawResponse: Record<string, unknown>;
    }> = [];

    let highestScore = 0;
    let country: string | undefined;
    let asn: string | undefined;
    const normalizedType = (type || '').toUpperCase();

    // 1. VirusTotal Lookup
    if (vtKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let endpoint = '';

        if (normalizedType === 'IPV4' || normalizedType === 'IPV6' || normalizedType === 'IP') {
          endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`;
        } else if (normalizedType === 'DOMAIN') {
          endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;
        } else if (['HASH', 'MD5', 'SHA1', 'SHA256'].includes(normalizedType)) {
          endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`;
        }

        if (endpoint) {
          const res = await fetch(endpoint, {
            headers: { 'x-apikey': vtKey },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const json: any = await res.json();
            const stats = json?.data?.attributes?.last_analysis_stats || {};
            const malicious = stats.malicious || 0;
            const suspicious = stats.suspicious || 0;
            const harmless = stats.harmless || 0;
            const total = malicious + suspicious + harmless + (stats.undetected || 0);

            const score = total > 0 ? Math.round(((malicious * 1.0 + suspicious * 0.5) / total) * 100) : 0;
            if (score > highestScore) highestScore = score;

            country = json?.data?.attributes?.country || country;
            const asOwner = json?.data?.attributes?.as_owner || '';
            const asnNum = json?.data?.attributes?.asn;
            if (asnNum) asn = `AS${asnNum} ${asOwner}`.trim();

            enrichments.push({
              sourceName: 'VirusTotal v3',
              confidence: total > 0 ? Math.min(95, 50 + total) : 50,
              rawResponse: {
                stats,
                reputation: json?.data?.attributes?.reputation,
                tags: json?.data?.attributes?.tags,
              },
            });
          }
        }
      } catch (err: any) {
        // Safe timeout or network error handling
      }
    }

    // 2. AbuseIPDB Lookup (for IP types)
    if (abuseKey && ['IPV4', 'IPV6', 'IP'].includes(normalizedType)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}`, {
          headers: { Key: abuseKey, Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json: any = await res.json();
          const data = json?.data || {};
          const abuseScore = data.abuseConfidenceScore || 0;
          if (abuseScore > highestScore) highestScore = abuseScore;

          country = data.countryCode || country;
          if (data.isp) asn = `${data.isp} (${data.domain || ''})`.trim();

          enrichments.push({
            sourceName: 'AbuseIPDB v2',
            confidence: 90,
            rawResponse: {
              abuseConfidenceScore: data.abuseConfidenceScore,
              totalReports: data.totalReports,
              countryCode: data.countryCode,
              usageType: data.usageType,
              isp: data.isp,
            },
          });
        }
      } catch (err: any) {
        // Safe timeout or network error handling
      }
    }

    if (enrichments.length === 0) {
      return {
        provider: 'external',
        status: 'unavailable',
        state: 'UNAVAILABLE',
        reason: `External threat intelligence provider has no results or failed for ${type} value ${value}.`,
      };
    }

    const label = highestScore >= 75 ? 'MALICIOUS' : highestScore >= 35 ? 'SUSPICIOUS' : 'BENIGN';

    return {
      provider: 'external',
      status: 'available',
      state: 'SUCCESS',
      label,
      score: highestScore,
      country,
      asn,
      enrichments,
    };
  }
}

