import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';
import { Prisma } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class VulnerabilitiesService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async getCatalog() {
    return this.prisma.vulnerability.findMany({
      orderBy: { cvssScore: 'desc' },
    });
  }

  async getAssetVulnerabilities(assetId?: string) {
    const where: Prisma.AssetVulnerabilityWhereInput = {
      asset: {
        organizationId: this.organizationId,
      },
    };

    if (assetId) {
      where.assetId = assetId;
    }

    return this.prisma.assetVulnerability.findMany({
      where,
      include: {
        asset: {
          select: {
            hostname: true,
            displayName: true,
          },
        },
        vulnerability: true,
      },
      orderBy: {
        vulnerability: {
          cvssScore: 'desc',
        },
      },
    });
  }

  async updateAssetVulnerability(id: string, data: any) {
    // Verify asset belongs to organization
    const mapping = await this.prisma.assetVulnerability.findFirst({
      where: {
        id,
        asset: {
          organizationId: this.organizationId,
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Asset Vulnerability mapping with ID ${id} not found`);
    }

    const updateData: Prisma.AssetVulnerabilityUpdateInput = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Adjust asset vulnerability count if remediating
      if (mapping.status === 'OPEN' && data.status === 'REMEDIATED') {
        await this.prisma.asset.update({
          where: { id: mapping.assetId },
          data: { vulnerabilityCount: { decrement: 1 } },
        });
      } else if (mapping.status === 'REMEDIATED' && data.status === 'OPEN') {
        await this.prisma.asset.update({
          where: { id: mapping.assetId },
          data: { vulnerabilityCount: { increment: 1 } },
        });
      }
    }
    if (data.remediationNotes !== undefined) updateData.remediationNotes = data.remediationNotes;
    if (data.exceptionStatus !== undefined) updateData.exceptionStatus = data.exceptionStatus;

    return this.prisma.assetVulnerability.update({
      where: { id },
      data: updateData,
    });
  }
}
