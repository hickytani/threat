import { IngestEventInput } from '../../events/event-pipeline.service.js';

export type IntegrationConnectorType = 'WEBHOOK' | 'GENERIC_HTTP' | 'AWS_CLOUDTRAIL';

export interface TelemetryConnector {
  readonly type: IntegrationConnectorType;

  /**
   * Validate connector-specific configuration object
   */
  validateConfiguration(config: Record<string, any>): void;

  /**
   * Normalize an incoming raw vendor payload into one or more canonical IngestEventInputs
   */
  normalize(
    rawPayload: Record<string, any>,
    fieldMap?: Record<string, string>,
    integrationName?: string,
  ): IngestEventInput[];

  /**
   * Test connection or configuration validity for the connector
   */
  testConnection?(config: Record<string, any>): Promise<{ success: boolean; message: string }>;
}
