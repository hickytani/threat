import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, HttpStatus, HttpCode, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import type { ActiveMember, AuthenticatedRequest } from '../auth/auth.interface.js';

@Controller('alerts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentMember() member: ActiveMember,
    @Query('status') status?: any,
    @Query('severity') severity?: any,
    @Query('category') category?: string,
    @Query('assetId') assetId?: string,
    @Query('search') search?: string,
  ) {
    return this.alertsService.findAll({
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
    @Param('alertId') alertId: string,
  ) {
    return this.alertsService.findOne(alertId);
  }

  @Patch(':alertId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('alertId') alertId: string,
    @Body() data: any,
  ) {
    return this.alertsService.update(alertId, data);
  }

  @Get(':alertId/related')
  @HttpCode(HttpStatus.OK)
  async getRelated(
    @Param('alertId') alertId: string,
  ) {
    return this.alertsService.getRelated(alertId);
  }

  @Post(':alertId/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('alertId') alertId: string,
    @Body('content') content: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const authorName = req.user?.fullName || 'SOC Analyst';
    return this.alertsService.addComment(alertId, content, userId, authorName);
  }

  @Post(':alertId/create-incident')
  @HttpCode(HttpStatus.CREATED)
  async createIncident(
    @Param('alertId') alertId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const fullName = req.user?.fullName || 'SOC Analyst';
    return this.alertsService.createIncident(alertId, userId, fullName);
  }
}
