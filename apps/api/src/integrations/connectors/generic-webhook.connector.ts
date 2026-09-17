import { Injectable } from '@nestjs/common';
import { TelemetryConnector, IntegrationConnectorType } from './telemetry-connector.interface.js';
import { IngestEventInput } from '../../events/event-pipeline.service.js';
import { FieldMapperUtil } from './field-mapper.util.js';

@Injectable()
export class GenericWebhookConnector implements TelemetryConnector {
  readonly type: IntegrationConnectorType = 'WEBHOOK';

  validateConfiguration(config: Record<string, any>): void {
    if (config?.fieldMap) {
      FieldMapperUtil.validateFieldMap(config.fieldMap);
    }
  }

  normalize(
    rawPayload: Record<string, any>,
    fieldMap: Record<string, string> = {},
    integrationName = 'Generic Webhook',
  ): IngestEventInput[] {
    FieldMapperUtil.validatePayloadSize(rawPayload);

    const eventType = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'eventType',
      ['event_name', 'eventType', 'event', 'type', 'alert_name', 'title'],
      'WEBHOOK_TELEMETRY',
    );

    const source = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'source',
      ['source', 'vendor', 'service', 'provider'],
      integrationName,
    );

    const action = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'action',
      ['action', 'activity', 'method'],
      'WEBHOOK_POST',
    );

    const outcome = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'outcome',
      ['outcome', 'status', 'result'],
      'SUCCESS',
    );

    const severity = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'severity',
      ['severity', 'level', 'priority'],
      'MEDIUM',
    );

    const message = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'message',
      ['message', 'detail', 'summary', 'description', 'details'],
      `Webhook telemetry received from ${integrationName}`,
    );

    const hostname = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'hostname',
      ['hostname', 'host', 'server', 'device', 'endpoint'],
    );

    const sourceIp = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'sourceIp',
      ['sourceIp', 'source_ip', 'client_ip', 'ip', 'src_ip'],
    );

    const userIdentity = FieldMapperUtil.resolveValue(
      rawPayload,
      fieldMap,
      'userIdentity',
      ['userIdentity', 'user_identity', 'user', 'username', 'user_name', 'account'],
    );

    return [
      {
        eventType: String(eventType),
        source: String(source),
        action: String(action),
        outcome: String(outcome),
        severity: String(severity),
        message: String(message),
        hostname: hostname ? String(hostname) : undefined,
        metadata: {
          sourceIp: sourceIp ? String(sourceIp) : undefined,
          userIdentity: userIdentity ? String(userIdentity) : undefined,
          integrationName,
          rawVendorPayload: rawPayload,
        },
        rawEvent: rawPayload,
      },
    ];
  }

  async testConnection(config: Record<string, any>): Promise<{ success: boolean; message: string }> {
    this.validateConfiguration(config);
    return {
      success: true,
      message: 'Generic Webhook configuration is valid.',
    };
  }
}
