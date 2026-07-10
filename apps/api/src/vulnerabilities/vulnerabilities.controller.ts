import { Controller, Get, Patch, Body, Param, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import { ActiveMember } from '../auth/auth.interface.js';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class VulnerabilitiesController {
  constructor(private vulnService: VulnerabilitiesService) {}

  @Get('vulnerabilities')
  @HttpCode(HttpStatus.OK)
  async getCatalog() {
    return this.vulnService.getCatalog();
  }

  @Get('asset-vulnerabilities')
  @HttpCode(HttpStatus.OK)
  async getAssetVulnerabilities(
    @Query('assetId') assetId?: string,
  ) {
    return this.vulnService.getAssetVulnerabilities(assetId);
  }

  @Patch('asset-vulnerabilities/:id')
  @HttpCode(HttpStatus.OK)
  async updateAssetVulnerability(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.vulnService.updateAssetVulnerability(id, data);
  }
}
