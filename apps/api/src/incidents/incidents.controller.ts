import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpStatus, HttpCode, Req } from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import { ActiveMember, AuthenticatedRequest } from '../auth/auth.interface.js';

@Controller('incidents')
@UseGuards(JwtAuthGuard, TenantGuard)
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentMember() member: ActiveMember,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.incidentsService.findAll(member.organizationId, {
      status,
      severity,
      priority,
      assigneeId,
    });
  }

  @Get(':incidentId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentMember() member: ActiveMember,
    @Param('incidentId') incidentId: string,
  ) {
    return this.incidentsService.findOne(member.organizationId, incidentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentMember() member: ActiveMember,
    @Body() data: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const fullName = req.user?.fullName || 'SOC Analyst';
    return this.incidentsService.create(member.organizationId, data, userId, fullName);
  }

  @Patch(':incidentId')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentMember() member: ActiveMember,
    @Param('incidentId') incidentId: string,
    @Body() data: any,
  ) {
    return this.incidentsService.update(member.organizationId, incidentId, data);
  }

  @Post(':incidentId/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentMember() member: ActiveMember,
    @Param('incidentId') incidentId: string,
    @Body('content') content: string,
    @Body('isInternalOnly') isInternalOnly: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const authorName = req.user?.fullName || 'SOC Analyst';
    return this.incidentsService.addComment(member.organizationId, incidentId, content, userId, authorName, isInternalOnly);
  }

  @Post(':incidentId/tasks')
  @HttpCode(HttpStatus.CREATED)
  async addTask(
    @CurrentMember() member: ActiveMember,
    @Param('incidentId') incidentId: string,
    @Body() data: any,
  ) {
    return this.incidentsService.addTask(member.organizationId, incidentId, data);
  }

  @Patch(':incidentId/tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  async updateTask(
    @CurrentMember() member: ActiveMember,
    @Param('incidentId') incidentId: string,
    @Param('taskId') taskId: string,
    @Body() data: any,
  ) {
    return this.incidentsService.updateTask(member.organizationId, incidentId, taskId, data);
  }

  @Post(':incidentId/evidence')
  @HttpCode(HttpStatus.CREATED)
  async addEvidence(
    @CurrentMember() member: ActiveMember,
    @Param('incidentId') incidentId: string,
    @Body() data: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const userName = req.user?.fullName || 'SOC Analyst';
    return this.incidentsService.addEvidence(member.organizationId, incidentId, data, userId, userName);
  }
}
