import { Module } from '@nestjs/common';
import { IntegrationsController, WebhookIngestionController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { EventsModule } from '../events/events.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { GenericWebhookConnector } from './connectors/generic-webhook.connector.js';
import { AwsCloudTrailConnector } from './connectors/aws-cloudtrail.connector.js';
import { ConnectorFactory } from './connectors/connector.factory.js';

@Module({
  imports: [EventsModule, NotificationsModule],
  controllers: [IntegrationsController, WebhookIngestionController],
  providers: [
    IntegrationsService,
    PrismaService,
    GenericWebhookConnector,
    AwsCloudTrailConnector,
    ConnectorFactory,
  ],
  exports: [IntegrationsService, ConnectorFactory],
})
export class IntegrationsModule {}

