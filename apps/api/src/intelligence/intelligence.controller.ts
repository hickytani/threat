import { Controller, Get, Post, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import type { ActiveMember } from '../auth/auth.interface.js';

@Controller('intelligence')
@UseGuards(JwtAuthGuard, TenantGuard)
export class IntelligenceController {
  constructor(private intelService: IntelligenceService) {}

  @Get('iocs')
  @HttpCode(HttpStatus.OK)
  async getIocs() {
    return this.intelService.getIocs();
  }

  @Post('investigate')
  @HttpCode(HttpStatus.OK)
  async investigate(
    @Body('value') value: string,
    @Body('type') type: string,
  ) {
    return this.intelService.investigate(value, type);
  }
}
