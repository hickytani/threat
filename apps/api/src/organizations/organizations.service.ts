import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { SeederService } from '../common/seeder.service.js';
import { PatchOrganizationDto } from './organizations.dto.js';

@Injectable({ scope: Scope.REQUEST })
export class OrganizationsService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
    private seeder: SeederService,
  ) {
    super(request, prisma);
  }

  async getCurrent() {
    const org = await this.prisma.organization.findUnique({
      where: { id: this.organizationId },
    });

    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }

    return org;
  }

  async update(dto: PatchOrganizationDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: this.organizationId },
    });
    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }
    return this.prisma.organization.update({
      where: { id: this.organizationId },
      data: dto,
    });
  }

  async getMembers() {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: this.organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
          },
        },
      },
    });
  }

  async seedDemo() {
    return this.seeder.seedOrganization(this.organizationId);
  }
}
