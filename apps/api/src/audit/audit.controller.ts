import { Controller, Get, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import { ActiveMember } from '../auth/auth.interface.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentMember() member: ActiveMember) {
    return this.auditService.findAll(member.organizationId);
  }
}
