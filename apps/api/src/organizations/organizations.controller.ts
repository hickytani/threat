import { Controller, Patch, Get, Post, Body, UseGuards, HttpStatus, HttpCode, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { PatchOrganizationDto } from './organizations.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Get('current')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrent() {
    return this.orgsService.getCurrent();
  }

  @Patch('current')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  async updateCurrent(
    @Body() dto: PatchOrganizationDto,
  ) {
    return this.orgsService.update(dto);
  }

  @Get('current/members')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  async getMembers() {
    return this.orgsService.getMembers();
  }

  @Post('current/seed-demo')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  async seedDemo() {
    if (process.env.ALLOW_DEMO_SEED !== 'true' || process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Demo seeding is disabled in this environment');
    }
    return this.orgsService.seedDemo();
  }
}
