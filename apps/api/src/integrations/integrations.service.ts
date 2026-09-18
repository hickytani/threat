import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { EventPipelineService } from '../events/event-pipeline.service.js';
import { ConnectorFactory } from './connectors/connector.factory.js';
import { CreateIntegrationDto, UpdateIntegrationDto } from './integrations.dto.js';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPipelineService: EventPipelineService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  async findAll(organizationId: string, type?: string) {
    const where: any = { organizationId };
    if (type) {
      where.type = type;
    }
    const integrations = await this.prisma.integration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return integrations.map((item) => this.sanitizeIntegration(item));
  }

  async findOne(organizationId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }
    return this.sanitizeIntegration(integration);
  }

  async create(
    organizationId: string,
    dto: CreateIntegrationDto,
    actor?: { id?: string; email?: string },
  ) {
    const connector = this.connectorFactory.getConnector(dto.type || 'WEBHOOK');
    if (dto.configuration) {
      connector.validateConfiguration(dto.configuration);
    }

    const webhookSecret = `whsec_${randomBytes(24).toString('hex')}`;
    const defaultConfig = {
      vendor: dto.type || 'GENERIC_WEBHOOK',
      fieldMap: {
        eventType: 'event_name',
        action: 'action',
        outcome: 'outcome',
        severity: 'severity',
        message: 'message',
        hostname: 'hostname',
        sourceIp: 'source_ip',
        ...(dto.configuration?.fieldMap || {}),
      },
      webhookSecret,
      ...(dto.configuration || {}),
    };
    delete (defaultConfig as any).webhookSecret;
    delete (defaultConfig as any).secret;

    let created: any;
    try {
      created = await this.prisma.integration.create({
        data: {
          organizationId,
          name: dto.name,
          type: dto.type || 'WEBHOOK',
          isEnabled: dto.isEnabled ?? true,
          status: 'ACTIVE',
          health: 'OK',
          eventCount: 0,
          errorCount: 0,
          configuration: JSON.parse(JSON.stringify(defaultConfig)),
          encryptedCredentials: this.encryptSecret(webhookSecret),
        },
      });
    } catch (err: any) {
      this.logger.error(`Integration creation error: ${err.message}`, err.stack);
      throw new BadRequestException(`Integration creation failed: ${err.message}`);
    }

    await this.createAuditLog(
      organizationId,
      actor,
      'INTEGRATION_CREATED',
      'INTEGRATION',
      created.id,
      'SUCCESS',
      { name: created.name, type: created.type },
    );

    // Return secret ONCE during creation
    return {
      ...this.sanitizeIntegration(created),
      secretToken: webhookSecret,
    };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateIntegrationDto,
    actor?: { id?: string; email?: string },
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }

    if (dto.configuration) {
      const connector = this.connectorFactory.getConnector(dto.type || existing.type);
      connector.validateConfiguration(dto.configuration);
    }

    const updatedConfig = {
      ...((existing.configuration as any) || {}),
      ...(dto.configuration || {}),
    };
    delete (updatedConfig as any).webhookSecret;
    delete (updatedConfig as any).secret;

    const isEnabled = dto.isEnabled !== undefined ? dto.isEnabled : existing.isEnabled;
    const nextStatus = dto.status !== undefined ? dto.status : isEnabled ? 'ACTIVE' : 'PAUSED';

    const updated = await this.prisma.integration.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        type: dto.type !== undefined ? dto.type : existing.type,
        isEnabled,
        status: nextStatus,
        configuration: updatedConfig as any,
      },
    });

    const action = isEnabled !== existing.isEnabled ? (isEnabled ? 'INTEGRATION_ENABLED' : 'INTEGRATION_DISABLED') : 'INTEGRATION_UPDATED';

    await this.createAuditLog(
      organizationId,
      actor,
      action,
      'INTEGRATION',
      updated.id,
      'SUCCESS',
      { name: updated.name, status: updated.status, isEnabled: updated.isEnabled },
    );

    return this.sanitizeIntegration(updated);
  }

  async regenerateSecret(
    organizationId: string,
    id: string,
    actor?: { id?: string; email?: string },
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }

    const newSecret = `whsec_${randomBytes(24).toString('hex')}`;
    const currentConfig = (existing.configuration as any) || {};
    delete currentConfig.webhookSecret;
    delete currentConfig.secret;

    const updated = await this.prisma.integration.update({
      where: { id },
      data: {
        encryptedCredentials: this.encryptSecret(newSecret),
        status: 'ACTIVE',
        health: 'OK',
        configuration: currentConfig as any,
      },
    });

    await this.createAuditLog(
      organizationId,
      actor,
      'INTEGRATION_SECRET_ROTATED',
      'INTEGRATION',
      id,
      'SUCCESS',
      { name: updated.name },
    );

    return {
      ...this.sanitizeIntegration(updated),
      secretToken: newSecret,
    };
  }

  async revokeSecret(
    organizationId: string,
    id: string,
    actor?: { id?: string; email?: string },
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }

    const currentConfig = (existing.configuration as any) || {};
    delete currentConfig.webhookSecret;

    const updated = await this.prisma.integration.update({
      where: { id },
      data: {
        encryptedCredentials: null,
        isEnabled: false,
        status: 'DISCONNECTED',
        health: 'DEGRADED',
        configuration: currentConfig as any,
      },
    });

    await this.createAuditLog(
      organizationId,
      actor,
      'INTEGRATION_SECRET_REVOKED',
      'INTEGRATION',
      id,
      'SUCCESS',
      { name: updated.name },
    );

    return this.sanitizeIntegration(updated);
  }

  async delete(
    organizationId: string,
    id: string,
    actor?: { id?: string; email?: string },
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }

    await this.prisma.integration.delete({
      where: { id },
    });

    await this.createAuditLog(
      organizationId,
      actor,
      'INTEGRATION_DELETED',
      'INTEGRATION',
      id,
      'SUCCESS',
      { name: existing.name },
    );

    return { success: true, message: `Integration ${existing.name} deleted successfully.` };
  }

  async getMetrics(organizationId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [eventsLast24h, eventsLastHour, totalEvents] = await Promise.all([
      this.prisma.securityEvent.count({
        where: {
          organizationId,
          metadata: { path: ['integrationId'], equals: id },
          timestamp: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.securityEvent.count({
        where: {
          organizationId,
          metadata: { path: ['integrationId'], equals: id },
          timestamp: { gte: oneHourAgo },
        },
      }),
      this.prisma.securityEvent.count({
        where: {
          organizationId,
          metadata: { path: ['integrationId'], equals: id },
        },
      }),
    ]);

    const alertsGenerated = await this.prisma.alert.count({
      where: {
        organizationId,
        source: integration.name,
      },
    });

    const incidentsGenerated = this.prisma.incident?.count
      ? await this.prisma.incident.count({
          where: {
            organizationId,
            alerts: { some: { source: integration.name } },
          },
        })
      : 0;

    const deduplicatedEvents = this.prisma.auditLog?.count
      ? await this.prisma.auditLog.count({
          where: {
            organizationId,
            action: 'EVENT_INGESTION_DUPLICATE',
            newValues: { path: ['integrationId'], equals: id },
          },
        })
      : 0;

    return {
      totalEvents: totalEvents || integration.eventCount || 0,
      eventsLast24h,
      eventsLastHour,
      alertsGenerated,
      incidentsGenerated,
      deduplicatedEvents,
      errorCount: integration.errorCount || 0,
      health: integration.health || 'OK',
      status: integration.status || 'ACTIVE',
      lastReceivedAt: integration.lastReceivedAt ? integration.lastReceivedAt.toISOString() : undefined,
      lastFailureAt: integration.lastFailureAt ? integration.lastFailureAt.toISOString() : undefined,
      lastErrorMessage: integration.lastErrorMessage || undefined,
    };
  }

  async testEvent(
    organizationId: string,
    id: string,
    samplePayload?: Record<string, any>,
    actor?: { id?: string; email?: string },
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });
    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found.`);
    }

    const payload = samplePayload || {
      event_name: 'TEST_TELEMETRY_EVENT',
      source: integration.name,
      severity: 'INFORMATIONAL',
      message: `Controlled integration test event for ${integration.name}`,
      hostname: 'test-endpoint-node-01',
      source_ip: '127.0.0.1',
      user_identity: actor?.email || 'analyst@threatsync.local',
      timestamp: new Date().toISOString(),
    };

    const connector = this.connectorFactory.getConnector(integration.type);
    const config = (integration.configuration as any) || {};
    const fieldMap: Record<string, string> = config.fieldMap || {};

    const normalizedInputs = connector.normalize(payload, fieldMap, integration.name);
    const results: any[] = [];

    for (const input of normalizedInputs) {
      const res = await this.eventPipelineService.processEvent({
        organizationId,
        input: {
          ...input,
          metadata: {
            ...input.metadata,
            integrationId: integration.id,
            isTestEvent: true,
          },
        },
        actor,
        context: { requestId: `req_test_${Date.now().toString(36)}` },
      });
      results.push(res);
    }

    await this.prisma.integration.update({
      where: { id },
      data: {
        lastSync: new Date(),
        lastReceivedAt: new Date(),
        lastSuccessfulAt: new Date(),
        eventCount: { increment: normalizedInputs.length },
        health: 'OK',
      },
    });

    await this.createAuditLog(
      organizationId,
      actor,
      'INTEGRATION_TESTED',
      'INTEGRATION',
      id,
      'SUCCESS',
      { eventsIngested: results.length },
    );

    return {
      success: true,
      message: `Successfully executed test event through connector ${integration.type}`,
      eventsProcessed: results.length,
      alertsCreated: results.flatMap((r) => r.alertsCreated || []),
    };
  }

  async processWebhookIngestion(params: {
    integrationId: string;
    providedSecret?: string;
    payload: Record<string, any>;
    requestId?: string;
  }) {
    const { integrationId, providedSecret, payload, requestId } = params;

    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new NotFoundException(`Webhook integration ${integrationId} not found.`);
    }

    if (!integration.isEnabled || integration.status === 'PAUSED' || integration.status === 'DISCONNECTED') {
      throw new BadRequestException(`Webhook integration ${integration.name} is disabled or disconnected.`);
    }

    const storedSecret = integration.encryptedCredentials || (integration.configuration as any)?.webhookSecret;
    const expectedSecret = storedSecret?.startsWith('enc:v1:') ? this.decryptSecret(storedSecret) : storedSecret;

    if (expectedSecret && providedSecret !== expectedSecret) {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          errorCount: { increment: 1 },
          lastFailureAt: new Date(),
          lastErrorMessage: 'Invalid webhook authentication secret.',
          health: 'DEGRADED',
        },
      });

      await this.createAuditLog(
        integration.organizationId,
        { email: `webhook:${integration.name}` },
        'INTEGRATION_AUTH_FAILED',
        'INTEGRATION',
        integrationId,
        'FAILURE',
        { requestId },
      );

      throw new UnauthorizedException(`Invalid webhook authentication secret for integration ${integrationId}.`);
    }

    try {
      const connector = this.connectorFactory.getConnector(integration.type);
      const config = (integration.configuration as any) || {};
      const fieldMap: Record<string, string> = config.fieldMap || {};

      const normalizedInputs = connector.normalize(payload, fieldMap, integration.name);
      let lastResult: any = null;

      for (const input of normalizedInputs) {
        lastResult = await this.eventPipelineService.processEvent({
          organizationId: integration.organizationId,
          input: {
            ...input,
            metadata: {
              ...input.metadata,
              integrationId: integration.id,
              integrationName: integration.name,
            },
          },
          actor: { email: `webhook:${integration.name}` },
          context: { requestId: requestId || `req_wh_${Date.now().toString(36)}` },
        });
      }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSync: new Date(),
          lastReceivedAt: new Date(),
          lastSuccessfulAt: new Date(),
          health: 'OK',
          status: 'ACTIVE',
          eventCount: { increment: normalizedInputs.length },
        },
      });

      return lastResult;
    } catch (err: any) {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          errorCount: { increment: 1 },
          lastFailureAt: new Date(),
          lastErrorMessage: err.message,
          health: 'DEGRADED',
        },
      });

      await this.createAuditLog(
        integration.organizationId,
        { email: `webhook:${integration.name}` },
        'INTEGRATION_INGESTION_FAILED',
        'INTEGRATION',
        integrationId,
        'FAILURE',
        { error: err.message, requestId },
      );

      throw err;
    }
  }

  private sanitizeIntegration(integration: any) {
    const copy = { ...integration };
    delete copy.encryptedCredentials;

    if (copy.configuration && copy.configuration.webhookSecret) {
      copy.configuration = {
        ...copy.configuration,
      };
      delete copy.configuration.webhookSecret;
    }

    return copy;
  }

  private encryptionKey() {
    const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new BadRequestException('Integration secret encryption is not configured. Set INTEGRATION_ENCRYPTION_KEY or SESSION_SECRET.');
    }
    return createHash('sha256').update(secret).digest();
  }

  private encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
  }

  private decryptSecret(value: string) {
    const [, version, ivEncoded, tagEncoded, ciphertextEncoded] = value.split(':');
    if (version !== 'v1' || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
      throw new BadRequestException('Stored integration secret has an invalid format.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async createAuditLog(
    organizationId: string,
    actor?: { id?: string; email?: string },
    action?: string,
    resourceType?: string,
    resourceId?: string,
    outcome = 'SUCCESS',
    newValues?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          actorId: actor?.id || 'system',
          actorEmail: actor?.email || 'system@threatsync.local',
          action: action || 'INTEGRATION_EVENT',
          resourceType: resourceType || 'INTEGRATION',
          resourceId: resourceId || 'none',
          requestId: `req_int_${Date.now().toString(36)}`,
          outcome,
          newValues: (newValues || {}) as any,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to create audit log for integration ${resourceId}: ${err.message}`);
    }
  }
}
