import { Module } from '@nestjs/common';
import { RulesController } from './rules.controller.js';
import { RulesService } from './rules.service.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  controllers: [RulesController],
  providers: [RulesService, PrismaService],
  exports: [RulesService],
})
export class RulesModule {}
