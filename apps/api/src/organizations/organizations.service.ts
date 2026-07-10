import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SeederService } from '../common/seeder.service.js';
import { PatchOrganizationDto } from './organizations.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private seeder: SeederService,
  ) {}

  async update(id: string, dto: PatchOrganizationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async getMembers(id: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: id },
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

  async seedDemo(id: string) {
    return this.seeder.seedOrganization(id);
  }
}
