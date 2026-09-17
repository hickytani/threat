import { Controller, Get, Req, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getSummary(request.member!.organizationId);
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  getActivity(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getActivity(request.member!.organizationId);
  }

  @Get('posture')
  @HttpCode(HttpStatus.OK)
  getPosture(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getPosture(request.member!.organizationId);
  }

  @Get('ingestion')
  @HttpCode(HttpStatus.OK)
  getIngestionMetrics(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getIngestionMetrics(request.member!.organizationId);
  }
}
