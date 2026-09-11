import { Controller, Post, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { IngestEventDto } from './events.dto.js';

@Controller('events')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(@Body() body: IngestEventDto) {
    return this.eventsService.ingest(body);
  }
}
