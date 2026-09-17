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
import { RulesService } from './rules.service.js';
import { CreateRuleDto, UpdateRuleDto } from './rules.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentMember } from '../auth/current-member.decorator.js';
import type { ActiveMember, AuthenticatedRequest } from '../auth/auth.interface.js';

@Controller('rules')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentMember() member: ActiveMember,
    @Query('isEnabled') isEnabled?: string,
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
  ) {
    const enabledBool = isEnabled === 'true' ? true : isEnabled === 'false' ? false : undefined;
    return this.rulesService.findAll({
      organizationId: member.organizationId,
      isEnabled: enabledBool,
      category,
      severity,
      search,
    });
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testRule(
    @CurrentMember() member: ActiveMember,
    @Body('matchConditions') matchConditions: Record<string, any>,
    @Body('sampleEvent') sampleEvent: Record<string, any>,
  ) {
    return this.rulesService.testRule(member.organizationId, matchConditions || {}, sampleEvent || {});
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@CurrentMember() member: ActiveMember, @Param('id') id: string) {
    return this.rulesService.findOne(member.organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentMember() member: ActiveMember,
    @Body() dto: CreateRuleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const author = req.user?.fullName || 'SOC Analyst';
    return this.rulesService.create(member.organizationId, dto, author);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentMember() member: ActiveMember,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rulesService.update(member.organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentMember() member: ActiveMember, @Param('id') id: string) {
    return this.rulesService.delete(member.organizationId, id);
  }
}
