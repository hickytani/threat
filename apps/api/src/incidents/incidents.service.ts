import { Inject, Injectable, Scope, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';
import { IncidentStatus, AlertSeverity, TaskStatus, EvidenceStatus, Prisma } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class IncidentsService extends TenantScopedRepository {
  constructor(
    @Inject(REQUEST) request: AuthenticatedRequest,
    prisma: PrismaService,
  ) {
    super(request, prisma);
  }

  async findAll(filters: {
    status?: IncidentStatus;
    severity?: AlertSeverity;
    priority?: AlertSeverity;
    assigneeId?: string;
  }) {
    const where: Prisma.IncidentWhereInput = {
      organizationId: this.organizationId,
    };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assignedAnalystId = filters.assigneeId;

    return this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
      include: {
        alerts: true,
        tasks: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        evidence: true,
      },
    });

    if (!inc) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    return inc;
  }

  async create(data: any, userId: string, fullName: string) {
    const inc = await this.prisma.incident.create({
      data: {
        organizationId: this.organizationId,
        title: data.title,
        summary: data.summary,
        severity: (data.severity as AlertSeverity) || AlertSeverity.MEDIUM,
        priority: (data.priority as AlertSeverity) || AlertSeverity.MEDIUM,
        status: IncidentStatus.OPEN,
        incidentType: data.incidentType || 'POLICY_VIOLATION',
        assignedAnalystId: data.assignedAnalystId || userId,
        assignedAnalystName: data.assignedAnalystId ? undefined : fullName,
        detectionTime: new Date(),
        slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours default SLA
        tags: data.tags || [],
      },
    });

    // Populate analyst name if custom analyst was specified
    if (data.assignedAnalystId) {
      const user = await this.prisma.user.findUnique({ where: { id: data.assignedAnalystId } });
      await this.prisma.incident.update({
        where: { id: inc.id },
        data: { assignedAnalystName: user?.fullName || 'SOC Analyst' },
      });
    }

    return inc;
  }

  async update(id: string, data: any) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });

    if (!inc) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    const updateData: Prisma.IncidentUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.severity !== undefined) updateData.severity = data.severity as AlertSeverity;
    if (data.priority !== undefined) updateData.priority = data.priority as AlertSeverity;
    if (data.status !== undefined) {
      updateData.status = data.status as IncidentStatus;
      if (data.status === IncidentStatus.CONTAINMENT_IN_PROGRESS && !inc.containmentTime) {
        updateData.containmentTime = new Date();
      }
      if (data.status === IncidentStatus.RESOLVED && !inc.resolutionTime) {
        updateData.resolutionTime = new Date();
      }
    }
    if (data.assignedAnalystId !== undefined) {
      updateData.assignedAnalystId = data.assignedAnalystId;
      if (data.assignedAnalystId) {
        const analyst = await this.prisma.user.findUnique({ where: { id: data.assignedAnalystId } });
        updateData.assignedAnalystName = analyst?.fullName || null;
      } else {
        updateData.assignedAnalystName = null;
      }
    }
    if (data.rootCause !== undefined) updateData.rootCause = data.rootCause;
    if (data.impact !== undefined) updateData.impact = data.impact;
    if (data.resolution !== undefined) updateData.resolution = data.resolution;
    if (data.lessonsLearned !== undefined) updateData.lessonsLearned = data.lessonsLearned;

    return this.prisma.incident.update({
      where: { id },
      data: updateData,
    });
  }

  async addComment(id: string, content: string, userId: string, authorName: string, isInternalOnly = false) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });
    if (!inc) throw new NotFoundException(`Incident with ID ${id} not found`);

    return this.prisma.incidentComment.create({
      data: {
        incidentId: id,
        authorId: userId,
        authorName,
        content,
        isInternalOnly,
      },
    });
  }

  async addTask(id: string, data: any) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });
    if (!inc) throw new NotFoundException(`Incident with ID ${id} not found`);

    return this.prisma.incidentTask.create({
      data: {
        incidentId: id,
        title: data.title,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        priority: (data.priority as AlertSeverity) || AlertSeverity.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: TaskStatus.PENDING,
        dependencies: data.dependencies || [],
      },
    });
  }

  async updateTask(id: string, taskId: string, data: any) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });
    if (!inc) throw new NotFoundException(`Incident with ID ${id} not found`);

    const updateData: Prisma.IncidentTaskUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status as TaskStatus;
    if (data.priority !== undefined) updateData.priority = data.priority as AlertSeverity;

    return this.prisma.incidentTask.update({
      where: { id: taskId, incidentId: id },
      data: updateData,
    });
  }

  async addEvidence(id: string, data: any, userId: string, userName: string) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
    });
    if (!inc) throw new NotFoundException(`Incident with ID ${id} not found`);

    return this.prisma.evidence.create({
      data: {
        incidentId: id,
        fileName: data.fileName,
        fileSize: data.fileSize || 100,
        mimeType: data.mimeType || 'text/plain',
        uploadedById: userId,
        uploadedByName: userName,
        fileUrl: data.fileUrl || '/evidence/mock-url',
        status: EvidenceStatus.CLEAN,
      },
    });
  }
}
