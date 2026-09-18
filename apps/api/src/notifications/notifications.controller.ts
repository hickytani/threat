import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationPolicyDto, UpdateNotificationPolicyDto } from './notifications.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import type { ActiveMember, AuthenticatedRequest } from '../auth/auth.interface.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from 'shared-types';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('policies')
  @HttpCode(HttpStatus.OK)
  async findAllPolicies(@CurrentMember() member: ActiveMember) {
    return this.notificationsService.findAllPolicies(member.organizationId);
  }

  @Get('policies/:id')
  @HttpCode(HttpStatus.OK)
  async findOnePolicy(@CurrentMember() member: ActiveMember, @Param('id') id: string) {
    return this.notificationsService.findOnePolicy(member.organizationId, id);
  }

  @Post('policies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole, 'SOC_MANAGER' as UserRole)
  @HttpCode(HttpStatus.CREATED)
  async createPolicy(
    @CurrentMember() member: ActiveMember,
    @Body() dto: CreateNotificationPolicyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorEmail = req.user?.email || 'admin@threatsync.local';
    return this.notificationsService.createPolicy(member.organizationId, dto, actorEmail);
  }

  @Patch('policies/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole, 'SOC_MANAGER' as UserRole)
  @HttpCode(HttpStatus.OK)
  async updatePolicy(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationPolicyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorEmail = req.user?.email || 'admin@threatsync.local';
    return this.notificationsService.updatePolicy(member.organizationId, id, dto, actorEmail);
  }

  @Delete('policies/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole, 'SOC_MANAGER' as UserRole)
  @HttpCode(HttpStatus.OK)
  async deletePolicy(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorEmail = req.user?.email || 'admin@threatsync.local';
    return this.notificationsService.deletePolicy(member.organizationId, id, actorEmail);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getDeliveryHistory(
    @CurrentMember() member: ActiveMember,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.notificationsService.getDeliveryHistory(member.organizationId, {
      status,
      limit: limitNum,
    });
  }
}
