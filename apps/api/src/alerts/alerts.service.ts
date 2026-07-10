import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';
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
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return alert;
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
      // Adjust activeAlertCount on assets if changing status
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
        const analyst = await this.prisma.user.findUnique({
          where: { id: data.assignedAnalystId },
        });
        updateData.assignedAnalystName = analyst?.fullName || null;
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

    // Create incident using details from the alert
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
        slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        tags: ['Escalated'] as any,
      },
    });

    // Link the alert to the incident
    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        incidentId: incident.id,
        status: AlertStatus.ESCALATED,
      },
    });

    // Log the audit record
    await this.prisma.auditLog.create({
      data: {
        organizationId: this.organizationId,
        actorId: userId,
        actorEmail: this.request.user?.email || '',
        action: 'ALERT_ESCALATION',
        resourceType: 'ALERT',
        resourceId: alertId,
        requestId: 'req_' + Math.random().toString(36).substring(2, 11),
        outcome: 'SUCCESS',
        newValues: { incidentId: incident.id } as any,
      },
    });

    return incident;
  }
}
