import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class VulnerabilitiesService {
  constructor(private prisma: PrismaService) {}

  async getCatalog() {
    return this.prisma.vulnerability.findMany({
      orderBy: { cvssScore: 'desc' },
    });
  }

  async getAssetVulnerabilities(organizationId: string, assetId?: string) {
    const where: any = {
      asset: {
        organizationId,
      },
    };

    if (assetId) {
      where.assetId = assetId;
    }

    const items = await this.prisma.assetVulnerability.findMany({
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

    return items;
  }

  async updateAssetVulnerability(organizationId: string, id: string, data: any) {
    // Verify asset belongs to organization
    const mapping = await this.prisma.assetVulnerability.findFirst({
      where: {
        id,
        asset: {
          organizationId,
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Asset Vulnerability mapping with ID ${id} not found`);
    }

    const updateData: any = {};
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
