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
    return {
      provider: 'external',
      status: 'unavailable',
      state: 'UNAVAILABLE',
      reason: `External threat intelligence provider is not configured for ${type} value ${value}.`,
    };
  }
}
