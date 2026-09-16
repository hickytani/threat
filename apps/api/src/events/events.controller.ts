import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { IngestionAuthGuard } from '../ingestion/ingestion-auth.guard.js';
import { IngestEventDto } from './events.dto.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  async search(@Query() query: any) {
    return this.eventsService.search(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post('ingest')
  @UseGuards(IngestionAuthGuard)
  @HttpCode(HttpStatus.OK)
  async ingest(@Body() body: IngestEventDto, @Query('async') isAsync?: string) {
    if (isAsync === 'true' || isAsync === '1') {
      const job = await this.eventsService.queueAsyncIngestion(body);
      return { queued: true, jobId: job.id, status: 'ACCEPTED' };
    }
    return this.eventsService.ingest(body);
  }
}

