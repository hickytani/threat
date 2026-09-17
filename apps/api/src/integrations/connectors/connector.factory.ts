import { Injectable, BadRequestException } from '@nestjs/common';
import { TelemetryConnector } from './telemetry-connector.interface.js';
import { GenericWebhookConnector } from './generic-webhook.connector.js';
import { AwsCloudTrailConnector } from './aws-cloudtrail.connector.js';

@Injectable()
export class ConnectorFactory {
  private readonly connectors = new Map<string, TelemetryConnector>();

  constructor(
    genericWebhook: GenericWebhookConnector,
    awsCloudTrail: AwsCloudTrailConnector,
  ) {
    this.connectors.set('WEBHOOK', genericWebhook);
    this.connectors.set('GENERIC_HTTP', genericWebhook);
    this.connectors.set('AWS_CLOUDTRAIL', awsCloudTrail);
  }

  getConnector(type: string): TelemetryConnector {
    const connector = this.connectors.get(type.toUpperCase());
    if (!connector) {
      // Default to generic webhook connector for unknown vendor types
      return this.connectors.get('WEBHOOK')!;
    }
    return connector;
  }
}
