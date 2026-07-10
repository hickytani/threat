import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class IntelligenceService {
  constructor(private prisma: PrismaService) {}

  async getIocs(organizationId: string) {
    const items = await this.prisma.iOC.findMany({
      where: { organizationId },
      orderBy: { lastObserved: 'desc' },
    });

    return items.map((ioc) => ({
      ...ioc,
      associatedDomains: JSON.parse(ioc.associatedDomains),
      associatedFiles: JSON.parse(ioc.associatedFiles),
    }));
  }

  async investigate(organizationId: string, value: string, type: string) {
    // Check if IOC is already cached
    let ioc = await this.prisma.iOC.findUnique({
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

    if (ioc) {
      return {
        ...ioc,
        associatedDomains: JSON.parse(ioc.associatedDomains),
        associatedFiles: JSON.parse(ioc.associatedFiles),
        enrichments: ioc.enrichments.map(e => ({ ...e, rawResponse: JSON.parse(e.rawResponse) })),
      };
    }

    // Generate mock reputation values
    const score = Math.floor(Math.random() * 85) + 15; // 15 - 100
    let label: 'MALICIOUS' | 'SUSPICIOUS' | 'UNKNOWN' = 'SUSPICIOUS';
    if (score > 80) label = 'MALICIOUS';
    else if (score < 40) label = 'UNKNOWN';

    let country = 'US';
    let asn = 'AS15169 Google LLC';

    if (type === 'IPV4' || type === 'IPV6') {
      const octet = parseInt(value.split('.')[0]) || 192;
      country = octet % 2 === 0 ? 'NL' : octet % 3 === 0 ? 'RU' : 'US';
      asn = octet % 2 === 0 ? 'AS31337 Leaseweb' : octet % 3 === 0 ? 'AS45678 Rostelecom' : 'AS15169 Google LLC';
    }

    // Create the IOC entry
    const newIoc = await this.prisma.iOC.create({
      data: {
        organizationId,
        value,
        type,
        reputationScore: score,
        label,
        country,
        asn,
        associatedDomains: JSON.stringify(type === 'IPV4' ? [`reverse-dns-${value}.net`] : []),
        associatedFiles: JSON.stringify(type === 'MD5' || type === 'SHA256' ? ['suspicious_temp_payload.exe'] : []),
        detectionCount: 1,
      },
    });

    // Create mock enrichments
    const enrich = await this.prisma.iOCEnrichment.create({
      data: {
        iocId: newIoc.id,
        sourceName: 'ThreatSync-Mock-Gateway',
        confidence: 85,
        rawResponse: JSON.stringify({
          scans: {
            avast: { detected: label === 'MALICIOUS', result: 'Trojan.Agent' },
            sophos: { detected: label === 'MALICIOUS', result: 'Malware' },
          },
          details: {
            threatCategory: type,
            scoreFactor: score,
          },
        }),
      },
    });

    return {
      ...newIoc,
      associatedDomains: JSON.parse(newIoc.associatedDomains),
      associatedFiles: JSON.parse(newIoc.associatedFiles),
      enrichments: [{
        ...enrich,
        rawResponse: JSON.parse(enrich.rawResponse),
      }],
    };
  }
}
