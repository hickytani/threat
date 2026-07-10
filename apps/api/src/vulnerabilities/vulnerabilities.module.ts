import { Module } from '@nestjs/common';
import { VulnerabilitiesController } from './vulnerabilities.controller.js';
import { VulnerabilitiesService } from './vulnerabilities.service.js';

@Module({
  controllers: [VulnerabilitiesController],
  providers: [VulnerabilitiesService],
  exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
