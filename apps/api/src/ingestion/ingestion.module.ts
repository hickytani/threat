import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller.js';
import { IngestionCredentialService } from './ingestion-credential.service.js';
import { IngestionAuthGuard } from './ingestion-auth.guard.js';

@Module({
  controllers: [IngestionController],
  providers: [IngestionCredentialService, IngestionAuthGuard],
  exports: [IngestionCredentialService, IngestionAuthGuard],
})
export class IngestionModule {}
