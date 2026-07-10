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
    @Query('status') status?: any,
    @Query('severity') severity?: any,
    @Query('priority') priority?: any,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.incidentsService.findAll({
      status,
      severity,
      priority,
      assigneeId,
    });
  }

  @Get(':incidentId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('incidentId') incidentId: string,
  ) {
    return this.incidentsService.findOne(incidentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const fullName = req.user?.fullName || 'SOC Analyst';
    return this.incidentsService.create(data, userId, fullName);
  }

  @Patch(':incidentId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('incidentId') incidentId: string,
    @Body() data: any,
  ) {
    return this.incidentsService.update(incidentId, data);
  }

  @Post(':incidentId/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('incidentId') incidentId: string,
    @Body('content') content: string,
    @Body('isInternalOnly') isInternalOnly: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const authorName = req.user?.fullName || 'SOC Analyst';
    return this.incidentsService.addComment(incidentId, content, userId, authorName, isInternalOnly);
  }

  @Post(':incidentId/tasks')
  @HttpCode(HttpStatus.CREATED)
  async addTask(
    @Param('incidentId') incidentId: string,
    @Body() data: any,
  ) {
    return this.incidentsService.addTask(incidentId, data);
  }

  @Patch(':incidentId/tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  async updateTask(
    @Param('incidentId') incidentId: string,
    @Param('taskId') taskId: string,
    @Body() data: any,
  ) {
    return this.incidentsService.updateTask(incidentId, taskId, data);
  }

  @Post(':incidentId/evidence')
  @HttpCode(HttpStatus.CREATED)
  async addEvidence(
    @Param('incidentId') incidentId: string,
    @Body() data: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || '';
    const userName = req.user?.fullName || 'SOC Analyst';
    return this.incidentsService.addEvidence(incidentId, data, userId, userName);
  }
}
