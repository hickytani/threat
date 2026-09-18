import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { AssetsService } from './assets.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('assets')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('search') search?: string,
    @Query('type') type?: any,
  ) {
    return this.assetsService.findAll(search, type);
  }

  @Get(':assetId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.findOne(assetId);
  }

  @Get(':assetId/timeline')
  @HttpCode(HttpStatus.OK)
  async getTimeline(
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.getTimeline(assetId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'SOC_MANAGER', 'SECURITY_ANALYST')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: any,
  ) {
    return this.assetsService.create(data);
  }

  @Patch(':assetId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'SOC_MANAGER', 'SECURITY_ANALYST')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('assetId') assetId: string,
    @Body() data: any,
  ) {
    return this.assetsService.update(assetId, data);
  }

  @Delete(':assetId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'SOC_MANAGER')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.remove(assetId);
  }
}
