import { Module } from '@nestjs/common';
import { IntegrationsController, WebhookIngestionController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { EventPipelineService } from '../events/event-pipeline.service.js';
import { CorrelationService } from '../queues/correlation.service.js';
import { GenericWebhookConnector } from './connectors/generic-webhook.connector.js';
import { AwsCloudTrailConnector } from './connectors/aws-cloudtrail.connector.js';
import { ConnectorFactory } from './connectors/connector.factory.js';

@Module({
  controllers: [IntegrationsController, WebhookIngestionController],
  providers: [
    IntegrationsService,
    PrismaService,
    EventPipelineService,
    CorrelationService,
    GenericWebhookConnector,
    AwsCloudTrailConnector,
    ConnectorFactory,
  ],
  exports: [IntegrationsService, ConnectorFactory],
})
export class IntegrationsModule {}
