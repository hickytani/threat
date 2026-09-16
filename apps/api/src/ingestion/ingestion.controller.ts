import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import type { ActiveMember } from '../auth/auth.interface.js';
import { CreateIngestionCredentialDto } from './ingestion.dto.js';
import { IngestionCredentialService } from './ingestion-credential.service.js';

@Controller('organizations/current/ingestion-credentials')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('ORG_ADMIN', 'SOC_MANAGER')
export class IngestionController {
  constructor(private credentials: IngestionCredentialService) {}

  @Get()
  list(@CurrentMember() member: ActiveMember) {
    return this.credentials.list(member.organizationId);
  }

  @Post()
  create(@CurrentMember() member: ActiveMember, @Body() dto: CreateIngestionCredentialDto) {
    return this.credentials.create(
      member.organizationId,
      dto.name,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
  }

  @Delete(':id')
  revoke(@CurrentMember() member: ActiveMember, @Param('id') id: string) {
    return this.credentials.revoke(member.organizationId, id);
  }
}
