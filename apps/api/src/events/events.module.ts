import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventsController } from './events.controller.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EventPipelineService } from './event-pipeline.service.js';

@Module({
  imports: [IngestionModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService, EventPipelineService],
  exports: [EventsService, EventPipelineService],
})
export class EventsModule {}

