import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service.js';
import { CreateIntegrationDto, UpdateIntegrationDto, TestEventDto } from './integrations.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import type { ActiveMember } from '../auth/auth.interface.js';
import { UserRole } from 'shared-types';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentMember() member: ActiveMember,
    @Query('type') type?: string,
  ) {
    return this.integrationsService.findAll(member.organizationId, type);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
  ) {
    return this.integrationsService.findOne(member.organizationId, id);
  }

  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  async getMetrics(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
  ) {
    return this.integrationsService.getMetrics(member.organizationId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentMember() member: ActiveMember,
    @Body() dto: CreateIntegrationDto,
  ) {
    return this.integrationsService.create(member.organizationId, dto, {
      id: member.userId,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole)
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.update(member.organizationId, id, dto, {
      id: member.userId,
    });
  }

  @Post(':id/regenerate-secret')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole)
  @HttpCode(HttpStatus.OK)
  async regenerateSecret(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
  ) {
    return this.integrationsService.regenerateSecret(member.organizationId, id, {
      id: member.userId,
    });
  }

  @Post(':id/revoke-secret')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole)
  @HttpCode(HttpStatus.OK)
  async revokeSecret(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
  ) {
    return this.integrationsService.revokeSecret(member.organizationId, id, {
      id: member.userId,
    });
  }

  @Post(':id/test-event')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole, 'SOC_MANAGER' as UserRole, 'SECURITY_ANALYST' as UserRole)
  @HttpCode(HttpStatus.OK)
  async testEvent(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
    @Body() dto: TestEventDto,
  ) {
    return this.integrationsService.testEvent(member.organizationId, id, dto.payload, {
      id: member.userId,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as UserRole, 'ORG_ADMIN' as UserRole)
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
  ) {
    return this.integrationsService.delete(member.organizationId, id, {
      id: member.userId,
    });
  }
}

@Controller('events/webhook')
export class WebhookIngestionController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post(':integrationId')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(
    @Param('integrationId') integrationId: string,
    @Headers('x-webhook-secret') secretHeader?: string,
    @Headers('x-integration-secret') altSecretHeader?: string,
    @Headers('authorization') authHeader?: string,
    @Query('secret') secretQuery?: string,
    @Body() body?: Record<string, any>,
    @Req() req?: any,
  ) {
    let secret = secretHeader || altSecretHeader || secretQuery;
    if (!secret && authHeader && authHeader.startsWith('Bearer ')) {
      secret = authHeader.replace('Bearer ', '').trim();
    }

    const payload = body || {};
    const requestId = req?.headers?.['x-request-id'] || `req_wh_${Date.now().toString(36)}`;

    return this.integrationsService.processWebhookIngestion({
      integrationId,
      providedSecret: secret,
      payload,
      requestId,
    });
  }
}
