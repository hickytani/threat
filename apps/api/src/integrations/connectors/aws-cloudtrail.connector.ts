import { Injectable, BadRequestException } from '@nestjs/common';
import { TelemetryConnector, IntegrationConnectorType } from './telemetry-connector.interface.js';
import { IngestEventInput } from '../../events/event-pipeline.service.js';
import { FieldMapperUtil } from './field-mapper.util.js';

@Injectable()
export class AwsCloudTrailConnector implements TelemetryConnector {
  readonly type: IntegrationConnectorType = 'AWS_CLOUDTRAIL';

  validateConfiguration(config: Record<string, any>): void {
    if (config?.fieldMap) {
      FieldMapperUtil.validateFieldMap(config.fieldMap);
    }
  }

  normalize(
    rawPayload: Record<string, any>,
    fieldMap: Record<string, string> = {},
    integrationName = 'AWS CloudTrail',
  ): IngestEventInput[] {
    FieldMapperUtil.validatePayloadSize(rawPayload);

    // Support CloudTrail batch format (Records: [...]) or single event object
    let records: Record<string, any>[] = [];

    if (Array.isArray(rawPayload.Records)) {
      records = rawPayload.Records;
    } else if (rawPayload.eventName || rawPayload.eventSource) {
      records = [rawPayload];
    } else {
      // Fallback: check if wrapped inside SNS / EventBridge message envelope
      if (typeof rawPayload.Message === 'string') {
        try {
          const parsedMessage = JSON.parse(rawPayload.Message);
          if (Array.isArray(parsedMessage.Records)) {
            records = parsedMessage.Records;
          } else {
            records = [parsedMessage];
          }
        } catch {
          records = [rawPayload];
        }
      } else {
        records = [rawPayload];
      }
    }

    return records.map((record) => this.normalizeCloudTrailRecord(record, fieldMap, integrationName));
  }

  private normalizeCloudTrailRecord(
    record: Record<string, any>,
    fieldMap: Record<string, string>,
    integrationName: string,
  ): IngestEventInput {
    const eventName = record.eventName || record.event_name || 'CloudTrailEvent';
    const eventSource = record.eventSource || record.event_source || 'aws.cloudtrail';
    const awsRegion = record.awsRegion || record.region || 'us-east-1';

    const userIdentityObj = record.userIdentity || {};
    const userName =
      userIdentityObj.userName ||
      userIdentityObj.principalId ||
      userIdentityObj.arn ||
      userIdentityObj.accountId ||
      'unknown-aws-principal';

    const sourceIp = record.sourceIPAddress || record.source_ip || record.client_ip;
    const errorCode = record.errorCode;
    const errorMessage = record.errorMessage;

    let outcome = 'SUCCESS';
    let severity = 'LOW';

    if (errorCode || errorMessage) {
      outcome = 'FAILURE';
      severity = errorCode.includes('Unauthorized') || errorCode.includes('AccessDenied') ? 'HIGH' : 'MEDIUM';
    }

    if (
      eventName.includes('DeleteBucket') ||
      eventName.includes('StopLogging') ||
      eventName.includes('PutGroupPolicy') ||
      eventName.includes('CreateUser') ||
      eventName.includes('AttachUserPolicy')
    ) {
      severity = severity === 'HIGH' ? 'CRITICAL' : 'HIGH';
    }

    const messageText = errorMessage
      ? `AWS CloudTrail ${eventName} failed: ${errorMessage}`
      : `AWS CloudTrail event ${eventName} executed on ${eventSource} (${awsRegion})`;

    const hostname = record.requestParameters?.bucketName || record.requestParameters?.instanceId || `${eventSource}`;

    return {
      eventType: String(eventName),
      source: String(eventSource),
      action: String(eventName),
      outcome,
      severity,
      message: messageText,
      hostname: String(hostname),
      metadata: {
        sourceIp: sourceIp ? String(sourceIp) : undefined,
        userIdentity: String(userName),
        awsRegion,
        errorCode,
        errorMessage,
        integrationName,
        requestParameters: record.requestParameters,
        responseElements: record.responseElements,
      },
      rawEvent: record,
    };
  }

  async testConnection(config: Record<string, any>): Promise<{ success: boolean; message: string }> {
    this.validateConfiguration(config);

    const hasRoleArn = Boolean(config.roleArn || config.awsRoleArn);
    const hasS3Bucket = Boolean(config.s3BucketName || config.bucketName);

    if (!hasRoleArn && !hasS3Bucket && !config.webhookSecret) {
      return {
        success: false,
        message: 'AWS CloudTrail integration requires either S3/Role ARN configuration or Webhook Secret credential.',
      };
    }

    return {
      success: true,
      message: 'AWS CloudTrail configuration structure is valid.',
    };
  }
}
