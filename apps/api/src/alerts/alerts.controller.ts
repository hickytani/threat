import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, HttpStatus, HttpCode, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import { ActiveMember, AuthenticatedRequest } from '../auth/auth.interface.js';

@Controller('alerts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentMember() member: ActiveMember,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('category') category?: string,
    @Query('assetId') assetId?: string,
    @Query('search') search?: string,
  ) {
    return this.alertsService.findAll(member.organizationId, {
      status,
      severity,
      category,
      assetId,
      search,
    });
  }

  @Get(':alertId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentMember() member: ActiveMember,
    @Param('alertId') alertId: string,
  ) {
    return this.alertsService.findOne(member.organizationId, alertId);
  }

  @Patch(':alertId')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentMember() member: ActiveMember,
    @Param('alertId') alertId: string,
    @Body() data: any,
  ) {
    return this.alertsService.update(member.organizationId, alertId, data);
  }

  @Post(':alertId/create-incident')
  @HttpCode(HttpStatus.CREATED)
  async createIncident(
    @CurrentMember() member: ActiveMember,
    @Param('alertId') alertId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const fullName = req.user?.fullName || 'SOC Analyst';
    return this.alertsService.createIncident(member.organizationId, alertId, userId, fullName);
  }
}
