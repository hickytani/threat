import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { AssetsService } from './assets.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import { ActiveMember } from '../auth/auth.interface.js';

@Controller('assets')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentMember() member: ActiveMember,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.assetsService.findAll(member.organizationId, search, type);
  }

  @Get(':assetId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentMember() member: ActiveMember,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.findOne(member.organizationId, assetId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentMember() member: ActiveMember,
    @Body() data: any,
  ) {
    return this.assetsService.create(member.organizationId, data);
  }

  @Patch(':assetId')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentMember() member: ActiveMember,
    @Param('assetId') assetId: string,
    @Body() data: any,
  ) {
    return this.assetsService.update(member.organizationId, assetId, data);
  }

  @Delete(':assetId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentMember() member: ActiveMember,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.remove(member.organizationId, assetId);
  }
}
