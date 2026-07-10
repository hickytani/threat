import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';
import { AssetType, AssetCriticality, Environment, Prisma } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class AssetsService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async findAll(search?: string, type?: AssetType) {
    const where: Prisma.AssetWhereInput = {
      organizationId: this.organizationId,
    };

    if (search) {
      where.OR = [
        { hostname: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    return this.prisma.asset.findMany({
      where,
      orderBy: { riskScore: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
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

    return asset;
  }

  async create(data: any) {
    return this.prisma.asset.create({
      data: {
        organizationId: this.organizationId,
        hostname: data.hostname,
        displayName: data.displayName || data.hostname,
        type: data.type as AssetType,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        operatingSystem: data.operatingSystem,
        cloudProvider: data.cloudProvider,
        region: data.region,
        owner: data.owner,
        department: data.department,
        businessCriticality: (data.businessCriticality as AssetCriticality) || AssetCriticality.MEDIUM,
        environment: (data.environment as Environment) || Environment.DEV,
        isInternetFacing: data.isInternetFacing || false,
        monitoringStatus: 'ACTIVE',
        tags: data.tags || [],
      },
    });
  }

  async update(id: string, data: any) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const updateData: Prisma.AssetUpdateInput = {};
    if (data.hostname !== undefined) updateData.hostname = data.hostname;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.businessCriticality !== undefined) updateData.businessCriticality = data.businessCriticality as AssetCriticality;
    if (data.monitoringStatus !== undefined) updateData.monitoringStatus = data.monitoringStatus;
    if (data.owner !== undefined) updateData.owner = data.owner;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.tags !== undefined) updateData.tags = data.tags;

    return this.prisma.asset.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }
}
