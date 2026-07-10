import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, search?: string, type?: string) {
    const where: any = { organizationId };

    if (search) {
      where.OR = [
        { hostname: { contains: search } },
        { ipAddress: { contains: search } },
        { displayName: { contains: search } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const items = await this.prisma.asset.findMany({
      where,
      orderBy: { riskScore: 'desc' },
    });

    return items.map(asset => ({
      ...asset,
      tags: JSON.parse(asset.tags),
    }));
  }

  async findOne(organizationId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
      include: {
        alerts: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        vulnerabilities: {
          include: {
            vulnerability: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return {
      ...asset,
      tags: JSON.parse(asset.tags),
    };
  }

  async create(organizationId: string, data: any) {
    const asset = await this.prisma.asset.create({
      data: {
        organizationId,
        hostname: data.hostname,
        displayName: data.displayName || data.hostname,
        type: data.type,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        operatingSystem: data.operatingSystem,
        cloudProvider: data.cloudProvider,
        region: data.region,
        owner: data.owner,
        department: data.department,
        businessCriticality: data.businessCriticality || 'MEDIUM',
        environment: data.environment || 'PROD',
        isInternetFacing: data.isInternetFacing || false,
        monitoringStatus: 'ACTIVE',
        tags: JSON.stringify(data.tags || []),
      },
    });

    return {
      ...asset,
      tags: JSON.parse(asset.tags),
    };
  }

  async update(organizationId: string, id: string, data: any) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const updateData: any = {};
    if (data.hostname !== undefined) updateData.hostname = data.hostname;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.businessCriticality !== undefined) updateData.businessCriticality = data.businessCriticality;
    if (data.monitoringStatus !== undefined) updateData.monitoringStatus = data.monitoringStatus;
    if (data.owner !== undefined) updateData.owner = data.owner;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

    const updated = await this.prisma.asset.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      tags: JSON.parse(updated.tags),
    };
  }

  async remove(organizationId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }
}
