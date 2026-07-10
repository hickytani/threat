import { Module, Global } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { QueueWorker } from './queue.worker.js';
import { CorrelationService } from './correlation.service.js';

@Global()
@Module({
  providers: [QueueService, QueueWorker, CorrelationService],
  exports: [QueueService, CorrelationService],
})
export class QueuesModule {}
