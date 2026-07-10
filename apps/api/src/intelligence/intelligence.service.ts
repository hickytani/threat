import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';
import { Prisma } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class IntelligenceService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async getIocs() {
    return this.prisma.iOC.findMany({
      where: { organizationId: this.organizationId },
      orderBy: { lastObserved: 'desc' },
    });
  }

  async investigate(value: string, type: string) {
    // Check if IOC is already cached
    let ioc = await this.prisma.iOC.findUnique({
      where: {
        organizationId_value: {
          organizationId: this.organizationId,
          value,
        },
      },
      include: {
        enrichments: true,
      },
    });

    if (ioc) {
      return ioc;
    }

    // Generate mock reputation values
    const score = Math.floor(Math.random() * 85) + 15; // 15 - 100
    let label = 'SUSPICIOUS';
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
        organizationId: this.organizationId,
        value,
        type,
        reputationScore: score,
        label,
        country,
        asn,
        associatedDomains: (type === 'IPV4' ? [`reverse-dns-${value}.net`] : []) as any,
        associatedFiles: (type === 'MD5' || type === 'SHA256' ? ['suspicious_temp_payload.exe'] : []) as any,
        detectionCount: 1,
      },
    });

    // Create mock enrichments
    const enrich = await this.prisma.iOCEnrichment.create({
      data: {
        iocId: newIoc.id,
        sourceName: 'ThreatSync-Mock-Gateway',
        confidence: 85,
        rawResponse: {
          scans: {
            avast: { detected: label === 'MALICIOUS', result: 'Trojan.Agent' },
            sophos: { detected: label === 'MALICIOUS', result: 'Malware' },
          },
          details: {
            threatCategory: type,
            scoreFactor: score,
          },
        } as any,
      },
    });

    return {
      ...newIoc,
      enrichments: [enrich],
    };
  }
}
