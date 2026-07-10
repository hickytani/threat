import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    filters: {
      status?: string;
      severity?: string;
      category?: string;
      assetId?: string;
      search?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.category) where.category = filters.category;
    if (filters.assetId) where.assetId = filters.assetId;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { ipAddress: { contains: filters.search } },
        { source: { contains: filters.search } },
      ];
    }

    const items = await this.prisma.alert.findMany({
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

    return items.map((alert) => ({
      ...alert,
      tags: JSON.parse(alert.tags),
      mitreTechniques: JSON.parse(alert.mitreTechniques),
      rawEvent: JSON.parse(alert.rawEvent),
    }));
  }

  async findOne(organizationId: string, id: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id, organizationId },
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

    return {
      ...alert,
      tags: JSON.parse(alert.tags),
      mitreTechniques: JSON.parse(alert.mitreTechniques),
      rawEvent: JSON.parse(alert.rawEvent),
    };
  }

  async update(organizationId: string, id: string, data: any) {
    const alert = await this.prisma.alert.findFirst({
      where: { id, organizationId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    const updateData: any = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Adjust activeAlertCount on assets if changing status
      if (alert.assetId) {
        if (alert.status !== 'RESOLVED' && data.status === 'RESOLVED') {
          await this.prisma.asset.update({
            where: { id: alert.assetId },
            data: { activeAlertCount: { decrement: 1 } },
          });
        } else if (alert.status === 'RESOLVED' && data.status !== 'RESOLVED') {
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

    const updated = await this.prisma.alert.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      tags: JSON.parse(updated.tags),
      mitreTechniques: JSON.parse(updated.mitreTechniques),
      rawEvent: JSON.parse(updated.rawEvent),
    };
  }

  async createIncident(organizationId: string, alertId: string, userId: string, fullName: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${alertId} not found`);
    }

    // Create incident using details from the alert
    const incident = await this.prisma.incident.create({
      data: {
        organizationId,
        title: `Escalated: ${alert.title}`,
        summary: `Incident escalated from Alert ID ${alert.id}. Category: ${alert.category}. Description: ${alert.description}`,
        severity: alert.severity,
        priority: alert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        incidentType: alert.category,
        assignedAnalystId: userId,
        assignedAnalystName: fullName,
        detectionTime: alert.timestamp,
        slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        tags: JSON.stringify(['Escalated']),
      },
    });

    // Link the alert to the incident
    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        incidentId: incident.id,
        status: 'ESCALATED',
      },
    });

    // Log the audit record
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        actorEmail: '',
        action: 'ALERT_ESCALATION',
        resourceType: 'ALERT',
        resourceId: alertId,
        requestId: 'req_' + Math.random().toString(36).substr(2, 9),
        outcome: 'SUCCESS',
        newValues: JSON.stringify({ incidentId: incident.id }),
      },
    });

    return incident;
  }
}
