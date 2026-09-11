import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { AlertStatus, AlertSeverity, Prisma } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class AlertsService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async findAll(filters: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    category?: string;
    assetId?: string;
    search?: string;
  }) {
    const where: Prisma.AlertWhereInput = {
      organizationId: this.organizationId,
    };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.category) where.category = filters.category;
    if (filters.assetId) where.assetId = filters.assetId;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        { source: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.alert.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        asset: {
          select: {
            id: true,
            hostname: true,
            displayName: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.alert.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
      include: {
        asset: true,
        incident: {
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    const rawEvent = (alert.rawEvent || {}) as Record<string, any>;
    const matchedConditions = rawEvent.matchedConditions || {};
    const detectionReason = alert.description || `Rule triggered for category ${alert.category}`;

    // Detection Rule
    let detectionRule: any = null;
    if (alert.detectionRuleId) {
      detectionRule = await this.prisma.detectionRule.findFirst({
        where: {
          id: alert.detectionRuleId,
          organizationId: this.organizationId,
        },
      });
    }

    // Contributing Events
    const eventOrConditions: Prisma.SecurityEventWhereInput[] = [];
    if (rawEvent.eventId) eventOrConditions.push({ id: rawEvent.eventId });
    if (alert.assetId) eventOrConditions.push({ assetId: alert.assetId });
    if (alert.ipAddress) eventOrConditions.push({ sourceIp: alert.ipAddress });
    if (alert.userIdentity) eventOrConditions.push({ userIdentity: alert.userIdentity });

    const contributingEvents = eventOrConditions.length > 0
      ? await this.prisma.securityEvent.findMany({
          where: {
            organizationId: this.organizationId,
            OR: eventOrConditions,
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        })
      : [];

    // Matched IOC
    let ioc: any = null;
    const iocLookupValues = [alert.ipAddress, alert.domain, alert.fileHash].filter(Boolean) as string[];
    if (iocLookupValues.length > 0) {
      ioc = await this.prisma.iOC.findFirst({
        where: {
          organizationId: this.organizationId,
          value: { in: iocLookupValues },
        },
      });
    }

    return {
      ...alert,
      detectionRule,
      detectionReason,
      matchedConditions,
      contributingEvents,
      ioc,
    };
  }

  async update(id: string, data: any) {
    const alert = await this.prisma.alert.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    const updateData: Prisma.AlertUpdateInput = {};
    if (data.status !== undefined) {
      updateData.status = data.status as AlertStatus;
      if (alert.assetId) {
        if (alert.status !== AlertStatus.RESOLVED && data.status === AlertStatus.RESOLVED) {
          await this.prisma.asset.update({
            where: { id: alert.assetId },
            data: { activeAlertCount: { decrement: 1 } },
          });
        } else if (alert.status === AlertStatus.RESOLVED && data.status !== AlertStatus.RESOLVED) {
          await this.prisma.asset.update({
            where: { id: alert.assetId },
            data: { activeAlertCount: { increment: 1 } },
          });
        }
      }
    }
    if (data.assignedAnalystId !== undefined) {
      updateData.assignedAnalystId = data.assignedAnalystId;
      if (data.assignedAnalystId) {
        // Scope analyst resolution to org membership — prevents cross-tenant name leakage
        const membership = await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: this.organizationId,
              userId: data.assignedAnalystId,
            },
          },
          include: { user: { select: { fullName: true } } },
        });
        updateData.assignedAnalystName = membership?.user?.fullName ?? null;
      } else {
        updateData.assignedAnalystName = null;
      }
    }

    return this.prisma.alert.update({
      where: { id },
      data: updateData,
    });
  }

  async createIncident(alertId: string, userId: string, fullName: string) {
    const alert = await this.prisma.alert.findFirst({
      where: {
        id: alertId,
        organizationId: this.organizationId,
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${alertId} not found`);
    }

    const incident = await this.prisma.incident.create({
      data: {
        organizationId: this.organizationId,
        title: `Escalated: ${alert.title}`,
        summary: `Incident escalated from Alert ID ${alert.id}. Category: ${alert.category}. Description: ${alert.description}`,
        severity: alert.severity,
        priority: alert.severity,
        status: 'OPEN',
        incidentType: alert.category,
        assignedAnalystId: userId,
        assignedAnalystName: fullName,
        detectionTime: alert.timestamp,
        slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
        tags: ['Escalated'] as any,
      },
    });

    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        incidentId: incident.id,
        status: AlertStatus.ESCALATED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: this.organizationId,
        actorId: userId,
        actorEmail: this.request.user?.email || 'analyst@threatsync.local',
        action: 'ALERT_ESCALATION',
        resourceType: 'ALERT',
        resourceId: alertId,
        requestId: `req_${Date.now().toString(36)}`,
        outcome: 'SUCCESS',
        newValues: { incidentId: incident.id } as any,
      },
    });

    return incident;
  }
}
