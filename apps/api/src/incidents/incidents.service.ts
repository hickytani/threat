import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    filters: {
      status?: string;
      severity?: string;
      priority?: string;
      assigneeId?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assignedAnalystId = filters.assigneeId;

    const items = await this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return items.map((inc) => ({
      ...inc,
      tags: JSON.parse(inc.tags),
    }));
  }

  async findOne(organizationId: string, id: string) {
    const inc = await this.prisma.incident.findFirst({
      where: { id, organizationId },
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

    return {
      ...inc,
      tags: JSON.parse(inc.tags),
      tasks: inc.tasks.map(t => ({ ...t, dependencies: JSON.parse(t.dependencies) })),
    };
  }

  async create(organizationId: string, data: any, userId: string, fullName: string) {
    const inc = await this.prisma.incident.create({
      data: {
        organizationId,
        title: data.title,
        summary: data.summary,
        severity: data.severity || 'MEDIUM',
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        incidentType: data.incidentType || 'POLICY_VIOLATION',
        assignedAnalystId: data.assignedAnalystId || userId,
        assignedAnalystName: data.assignedAnalystId ? undefined : fullName,
        detectionTime: new Date(),
        slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours default SLA
        tags: JSON.stringify(data.tags || []),
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

  async update(organizationId: string, id: string, data: any) {
    const inc = await this.prisma.incident.findFirst({
      where: { id, organizationId },
    });

    if (!inc) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'CONTAINED' && !inc.containmentTime) {
        updateData.containmentTime = new Date();
      }
      if (data.status === 'RESOLVED' && !inc.resolutionTime) {
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

    const updated = await this.prisma.incident.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  async addComment(organizationId: string, id: string, content: string, userId: string, authorName: string, isInternalOnly = false) {
    const inc = await this.prisma.incident.findFirst({ where: { id, organizationId } });
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

  async addTask(organizationId: string, id: string, data: any) {
    const inc = await this.prisma.incident.findFirst({ where: { id, organizationId } });
    if (!inc) throw new NotFoundException(`Incident with ID ${id} not found`);

    const task = await this.prisma.incidentTask.create({
      data: {
        incidentId: id,
        title: data.title,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: 'PENDING',
        dependencies: JSON.stringify(data.dependencies || []),
      },
    });

    return {
      ...task,
      dependencies: JSON.parse(task.dependencies),
    };
  }

  async updateTask(organizationId: string, id: string, taskId: string, data: any) {
    const inc = await this.prisma.incident.findFirst({ where: { id, organizationId } });
    if (!inc) throw new NotFoundException(`Incident with ID ${id} not found`);

    const task = await this.prisma.incidentTask.update({
      where: { id: taskId, incidentId: id },
      data,
    });

    return {
      ...task,
      dependencies: JSON.parse(task.dependencies),
    };
  }

  async addEvidence(organizationId: string, id: string, data: any, userId: string, userName: string) {
    const inc = await this.prisma.incident.findFirst({ where: { id, organizationId } });
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
        status: 'CLEAN',
      },
    });
  }
}
