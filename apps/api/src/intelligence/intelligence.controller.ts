import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';

@Controller('intelligence')
@UseGuards(JwtAuthGuard, TenantGuard)
export class IntelligenceController {
  constructor(private intelService: IntelligenceService) {}

  @Get('iocs')
  @HttpCode(HttpStatus.OK)
  async getIocs() {
    return this.intelService.getIocs();
  }

  @Get('iocs/:id')
  @HttpCode(HttpStatus.OK)
  async getIocDetail(@Param('id') id: string) {
    return this.intelService.getIocDetail(id);
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
