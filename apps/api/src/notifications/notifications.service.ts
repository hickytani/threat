import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { AlertSeverity } from '@prisma/client';
import { CreateNotificationPolicyDto, UpdateNotificationPolicyDto } from './notifications.dto.js';
import { URL } from 'url';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllPolicies(organizationId: string) {
    return this.prisma.notificationPolicy.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePolicy(organizationId: string, id: string) {
    const policy = await this.prisma.notificationPolicy.findFirst({
      where: { id, organizationId },
    });
    if (!policy) {
      throw new NotFoundException(`Notification policy ${id} not found.`);
    }
    return policy;
  }

  async createPolicy(organizationId: string, dto: CreateNotificationPolicyDto, actorEmail?: string) {
    this.validateWebhookUrl(dto.webhookUrl);

    const policy = await this.prisma.notificationPolicy.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description || `Webhook notification policy: ${dto.name}`,
        isEnabled: dto.isEnabled ?? true,
        minSeverity: (dto.minSeverity as AlertSeverity) || AlertSeverity.HIGH,
        channelType: dto.channelType || 'WEBHOOK',
        webhookUrl: dto.webhookUrl,
        secretToken: dto.secretToken || null,
      },
    });

    await this.createAuditLog(organizationId, actorEmail, 'NOTIFICATION_POLICY_CREATED', 'NOTIFICATION_POLICY', policy.id, 'SUCCESS', {
      policyName: policy.name,
      minSeverity: policy.minSeverity,
    });

    return policy;
  }

  async updatePolicy(organizationId: string, id: string, dto: UpdateNotificationPolicyDto, actorEmail?: string) {
    await this.findOnePolicy(organizationId, id);

    if (dto.webhookUrl) {
      this.validateWebhookUrl(dto.webhookUrl);
    }

    const updated = await this.prisma.notificationPolicy.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isEnabled: dto.isEnabled,
        minSeverity: dto.minSeverity as AlertSeverity,
        channelType: dto.channelType,
        webhookUrl: dto.webhookUrl,
        secretToken: dto.secretToken,
      },
    });

    await this.createAuditLog(organizationId, actorEmail, 'NOTIFICATION_POLICY_UPDATED', 'NOTIFICATION_POLICY', updated.id, 'SUCCESS', {
      policyName: updated.name,
      isEnabled: updated.isEnabled,
    });

    return updated;
  }

  async deletePolicy(organizationId: string, id: string, actorEmail?: string) {
    await this.findOnePolicy(organizationId, id);
    const deleted = await this.prisma.notificationPolicy.delete({
      where: { id },
    });

    await this.createAuditLog(organizationId, actorEmail, 'NOTIFICATION_POLICY_DELETED', 'NOTIFICATION_POLICY', id, 'SUCCESS', {
      policyName: deleted.name,
    });

    return deleted;
  }

  async getDeliveryHistory(organizationId: string, params: { status?: string; limit?: number }) {
    const where: any = { organizationId };
    if (params.status) {
      where.status = params.status;
    }
    return this.prisma.notificationDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, params.limit || 50),
      include: {
        policy: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Event-driven trigger evaluated whenever an Alert is generated.
   */
  async evaluateAndDispatchAlertNotifications(organizationId: string, alert: any) {
    const activePolicies = await this.prisma.notificationPolicy.findMany({
      where: {
        organizationId,
        isEnabled: true,
      },
    });

    const severityRank: Record<AlertSeverity, number> = {
      INFORMATIONAL: 1,
      LOW: 2,
      MEDIUM: 3,
      HIGH: 4,
      CRITICAL: 5,
    };

    const alertRank = severityRank[alert.severity as AlertSeverity] || 1;

    for (const policy of activePolicies) {
      const policyMinRank = severityRank[policy.minSeverity as AlertSeverity] || 1;

      if (alertRank >= policyMinRank) {
        const payload = {
          event: 'SECURITY_ALERT_GENERATED',
          alertId: alert.id,
          title: alert.title,
          severity: alert.severity,
          category: alert.category,
          source: alert.source,
          assetId: alert.assetId,
          ipAddress: alert.ipAddress,
          timestamp: alert.createdAt || new Date().toISOString(),
          organizationId,
        };

        const delivery = await this.prisma.notificationDelivery.create({
          data: {
            organizationId,
            policyId: policy.id,
            alertId: alert.id,
            provider: policy.channelType || 'WEBHOOK',
            destinationUrl: policy.webhookUrl,
            status: 'QUEUED',
            payload: payload as any,
          },
        });

        // Perform delivery asynchronously
        setImmediate(() => {
          this.deliverWebhookNotification(delivery.id, policy.secretToken || undefined).catch((err) => {
            this.logger.error(`Failed to process webhook delivery ${delivery.id}: ${err.message}`);
          });
        });
      }
    }
  }

  /**
   * Outbound Webhook Delivery Execution with SSRF validation and bounds.
   */
  async deliverWebhookNotification(deliveryId: string, secretToken?: string) {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) return;

    // SSRF Validation
    try {
      this.validateWebhookUrl(delivery.destinationUrl);
    } catch (err: any) {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          attemptCount: 1,
          responseMetadata: { error: `SSRF_BLOCK: ${err.message}` } as any,
        },
      });

      await this.createAuditLog(delivery.organizationId, 'system', 'NOTIFICATION_FAILED', 'NOTIFICATION_DELIVERY', delivery.id, 'FAILURE', {
        reason: err.message,
        url: delivery.destinationUrl,
      });

      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s bounded timeout

    try {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'SENDING', attemptCount: { increment: 1 } },
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ThreatSync-OS-NotificationEngine/2.0',
      };
      if (secretToken) {
        headers['X-Notification-Secret'] = secretToken;
      }

      const response = await fetch(delivery.destinationUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
        redirect: 'manual',
      });

      clearTimeout(timeout);

      // SSRF Protection: Reject automatic HTTP 3xx redirects
      if (response.status >= 300 && response.status < 400) {
        throw new Error(`SSRF Security Guard: Target URL returned redirect status ${response.status}. Automatic HTTP redirects are restricted to prevent SSRF bypasses.`);
      }

      const statusText = response.statusText || 'OK';
      const isSuccess = response.ok;

      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: isSuccess ? 'DELIVERED' : 'FAILED',
          sentAt: isSuccess ? new Date() : undefined,
          failedAt: isSuccess ? undefined : new Date(),
          responseMetadata: {
            statusCode: response.status,
            statusText,
          } as any,
        },
      });

      await this.createAuditLog(
        delivery.organizationId,
        'system',
        isSuccess ? 'NOTIFICATION_DELIVERED' : 'NOTIFICATION_FAILED',
        'NOTIFICATION_DELIVERY',
        delivery.id,
        isSuccess ? 'SUCCESS' : 'FAILURE',
        {
          statusCode: response.status,
          destinationUrl: delivery.destinationUrl,
        },
      );
    } catch (err: any) {
      clearTimeout(timeout);
      const errorMessage = err.name === 'AbortError' ? 'Webhook connection timed out (5s)' : err.message;

      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          responseMetadata: { error: errorMessage } as any,
        },
      });

      await this.createAuditLog(delivery.organizationId, 'system', 'NOTIFICATION_FAILED', 'NOTIFICATION_DELIVERY', delivery.id, 'FAILURE', {
        reason: errorMessage,
        destinationUrl: delivery.destinationUrl,
      });
    }
  }

  /**
   * Anti-SSRF URL Validation. Refuses private IPs, loopback, link-local metadata endpoints.
   */
  public validateWebhookUrl(rawUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`Invalid webhook URL format: ${rawUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException(`Webhook protocol must be HTTP or HTTPS. Received: ${parsed.protocol}`);
    }

    const rawHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    // Loopback & Localhost check
    if (
      rawHost === 'localhost' ||
      rawHost === '127.0.0.1' ||
      rawHost === '0.0.0.0' ||
      rawHost === '::1' ||
      rawHost === '0:0:0:0:0:0:0:1' ||
      rawHost.endsWith('.localhost') ||
      rawHost.endsWith('.local')
    ) {
      throw new BadRequestException(`SSRF Security Guard: Target host ${rawHost} is restricted.`);
    }

    // AWS / Cloud Metadata Service
    if (
      rawHost === '169.254.169.254' ||
      rawHost === 'metadata.google.internal' ||
      rawHost.includes('169.254.169.254')
    ) {
      throw new BadRequestException(`SSRF Security Guard: Cloud metadata endpoint ${rawHost} is restricted.`);
    }

    // IPv6 Link-Local / Private / IPv4-mapped Checks
    if (
      rawHost.startsWith('fe80:') ||
      rawHost.startsWith('fc00:') ||
      rawHost.startsWith('fd00:') ||
      rawHost.includes('::ffff:127.') ||
      rawHost.includes('::ffff:10.') ||
      rawHost.includes('::ffff:192.168.')
    ) {
      throw new BadRequestException(`SSRF Security Guard: Private/Link-Local IPv6 range ${rawHost} is restricted.`);
    }

    // Single DWORD / Hex / Octal numeric IP detection (e.g. 2130706433 = 127.0.0.1, 0x7f000001 = 127.0.0.1)
    if (/^(0x[0-9a-f]+|\d+)$/i.test(rawHost)) {
      throw new BadRequestException(`SSRF Security Guard: Numeric DWORD IP representation ${rawHost} is restricted.`);
    }

    // Private IPv4 Ranges
    const ipParts = rawHost.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p))) {
      const [first, second] = ipParts;
      if (first === 127 || first === 0) {
        throw new BadRequestException(`SSRF Security Guard: Loopback range ${rawHost} is restricted.`);
      }
      if (first === 10) {
        throw new BadRequestException(`SSRF Security Guard: Private IP range 10.0.0.0/8 is restricted.`);
      }
      if (first === 172 && second >= 16 && second <= 31) {
        throw new BadRequestException(`SSRF Security Guard: Private IP range 172.16.0.0/12 is restricted.`);
      }
      if (first === 192 && second === 168) {
        throw new BadRequestException(`SSRF Security Guard: Private IP range 192.168.0.0/16 is restricted.`);
      }
      if (first === 169 && second === 254) {
        throw new BadRequestException(`SSRF Security Guard: Link-local IP range 169.254.0.0/16 is restricted.`);
      }
    }
  }

  private async createAuditLog(
    organizationId: string,
    actorEmail: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    outcome: string,
    newValues?: Record<string, any>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: 'system',
        actorEmail: actorEmail || 'system@threatsync.local',
        action,
        resourceType,
        resourceId,
        requestId: `req_notif_${Date.now().toString(36)}`,
        outcome,
        newValues: (newValues || {}) as any,
      },
    });
  }
}
