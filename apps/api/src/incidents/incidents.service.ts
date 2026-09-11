import { Inject, Injectable, Scope, NotFoundException, BadRequestException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service.js';
import { TenantScopedRepository } from '../common/tenant-scoped.repository.js';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { IncidentStatus, AlertSeverity, TaskStatus, EvidenceStatus, Prisma } from '@prisma/client';
import { buildDeterministicTimeline } from '../common/timeline.util.js';

const ALLOWED_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.TRIAGED, IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED],
  [IncidentStatus.TRIAGED]: [IncidentStatus.INVESTIGATING, IncidentStatus.CONTAINMENT_IN_PROGRESS, IncidentStatus.CLOSED],
  [IncidentStatus.INVESTIGATING]: [IncidentStatus.CONTAINMENT_IN_PROGRESS, IncidentStatus.CONTAINED, IncidentStatus.REMEDIATION_IN_PROGRESS, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  [IncidentStatus.CONTAINMENT_IN_PROGRESS]: [IncidentStatus.CONTAINED, IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED],
  [IncidentStatus.CONTAINED]: [IncidentStatus.REMEDIATION_IN_PROGRESS, IncidentStatus.MONITORING, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  [IncidentStatus.REMEDIATION_IN_PROGRESS]: [IncidentStatus.MONITORING, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  [IncidentStatus.MONITORING]: [IncidentStatus.RESOLVED, IncidentStatus.REMEDIATION_IN_PROGRESS, IncidentStatus.CLOSED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.OPEN, IncidentStatus.INVESTIGATING],
  [IncidentStatus.CLOSED]: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING],
};

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
      take: 100,
    });
  }

  async findOne(id: string) {
    const inc = await this.prisma.incident.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
      include: {
        alerts: {
          include: {
            asset: true,
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        evidence: true,
      },
    });

    if (!inc) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    const alertIds = inc.alerts.map(a => a.id);
    const assetIds = Array.from(new Set(inc.alerts.map(a => a.assetId).filter(Boolean))) as string[];
    const ipAddresses = Array.from(new Set(inc.alerts.map(a => a.ipAddress).filter(Boolean))) as string[];
    const domains = Array.from(new Set(inc.alerts.map(a => a.domain).filter(Boolean))) as string[];
    const fileHashes = Array.from(new Set(inc.alerts.map(a => a.fileHash).filter(Boolean))) as string[];
    const userIdentities = Array.from(new Set(inc.alerts.map(a => a.userIdentity).filter(Boolean))) as string[];

    // 1. Triggering Events (bounded query)
    const eventConditions: Prisma.SecurityEventWhereInput[] = [];
    if (assetIds.length > 0) eventConditions.push({ assetId: { in: assetIds } });
    if (ipAddresses.length > 0) eventConditions.push({ sourceIp: { in: ipAddresses } });
    if (userIdentities.length > 0) eventConditions.push({ userIdentity: { in: userIdentities } });

    const triggeringEvents = eventConditions.length > 0
      ? await this.prisma.securityEvent.findMany({
          where: {
            organizationId: this.organizationId,
            OR: eventConditions,
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
        })
      : [];

    // 2. Affected Assets
    const affectedAssets = inc.alerts.map(a => a.asset).filter(Boolean);
    const uniqueAssetsMap = new Map();
    for (const asset of affectedAssets) {
      if (asset && !uniqueAssetsMap.has(asset.id)) {
        uniqueAssetsMap.set(asset.id, asset);
      }
    }
    const uniqueAffectedAssets = Array.from(uniqueAssetsMap.values());

    // 3. Involved Users / Actors
    const usersMap = new Map<string, { id?: string; email?: string; name: string; role?: string }>();
    if (inc.assignedAnalystId) {
      usersMap.set(inc.assignedAnalystId, {
        id: inc.assignedAnalystId,
        name: inc.assignedAnalystName || 'Assigned Analyst',
        role: 'ASSIGNEE',
      });
    }
    for (const comment of inc.comments) {
      if (comment.authorId) {
        usersMap.set(comment.authorId, {
          id: comment.authorId,
          name: comment.authorName || 'Commenter',
          role: 'COMMENT_AUTHOR',
        });
      }
    }
    for (const userIdent of userIdentities) {
      usersMap.set(userIdent, {
        name: userIdent,
        role: 'TARGET_USER_IDENTITY',
      });
    }
    const users = Array.from(usersMap.values());

    // 4. Related IOCs (matching alert IPs/domains/fileHashes)
    const iocValues = Array.from(new Set([...ipAddresses, ...domains, ...fileHashes]));
    const hasIocFindMany = Boolean(this.prisma.iOC && typeof this.prisma.iOC.findMany === 'function');
    const iocs = (iocValues.length > 0 && hasIocFindMany)
      ? await this.prisma.iOC.findMany({
          where: {
            organizationId: this.organizationId,
            value: { in: iocValues },
          },
          take: 20,
        })
      : [];

    // 5. Open Vulnerabilities for affected assets
    const hasVulnFindMany = Boolean(this.prisma.assetVulnerability && typeof this.prisma.assetVulnerability.findMany === 'function');
    const vulnerabilities = (assetIds.length > 0 && hasVulnFindMany)
      ? await this.prisma.assetVulnerability.findMany({
          where: {
            assetId: { in: assetIds },
            status: { in: ['OPEN', 'EXCEPTION'] },
          },
          include: {
            vulnerability: true,
          },
          take: 20,
        })
      : [];

    // 6. Relevant Audit History
    const hasAuditLogFindMany = Boolean(this.prisma.auditLog && typeof this.prisma.auditLog.findMany === 'function');
    const auditHistory = hasAuditLogFindMany
      ? await this.prisma.auditLog.findMany({
          where: {
            organizationId: this.organizationId,
            OR: [
              { resourceType: 'INCIDENT', resourceId: id },
              { resourceType: 'ALERT', resourceId: { in: alertIds.length > 0 ? alertIds : ['__none__'] } },
            ],
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
        })
      : [];

    // 7. Deterministic Timeline
    const timeline = buildDeterministicTimeline({
      securityEvents: triggeringEvents,
      alerts: inc.alerts,
      auditLogs: auditHistory,
      comments: inc.comments,
      tasks: inc.tasks,
    });

    return {
      ...inc,
      triggeringEvents,
      affectedAssets: uniqueAffectedAssets,
      users,
      iocs,
      vulnerabilities,
      auditHistory,
      timeline,
    };
  }

  async getTimeline(id: string) {
    const detail = await this.findOne(id);
    return detail.timeline;
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

    if (data.assignedAnalystId) {
      // Scope analyst resolution to org membership — prevents cross-tenant name disclosure
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: this.organizationId,
            userId: data.assignedAnalystId,
          },
        },
        include: { user: { select: { fullName: true } } },
      });
      await this.prisma.incident.update({
        where: { id: inc.id },
        data: { assignedAnalystName: membership?.user?.fullName ?? 'SOC Analyst' },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: this.organizationId,
        actorId: userId,
        actorEmail: this.request.user?.email || 'analyst@threatsync.local',
        action: 'INCIDENT_CREATED',
        resourceType: 'INCIDENT',
        resourceId: inc.id,
        requestId: `req_${Date.now().toString(36)}`,
        outcome: 'SUCCESS',
        newValues: { title: inc.title, severity: inc.severity, status: inc.status } as any,
      },
    });

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

    // SAFE LIFECYCLE TRANSITION LOGIC
    if (data.status !== undefined && data.status !== inc.status) {
      const newStatus = data.status as IncidentStatus;
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[inc.status] || [];

      if (!allowedNext.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid incident status transition from ${inc.status} to ${newStatus}. Allowed transitions: ${allowedNext.join(', ')}`,
        );
      }

      updateData.status = newStatus;

      if ((newStatus === IncidentStatus.CONTAINMENT_IN_PROGRESS || newStatus === IncidentStatus.CONTAINED) && !inc.containmentTime) {
        updateData.containmentTime = new Date();
      }
      if ((newStatus === IncidentStatus.RESOLVED || newStatus === IncidentStatus.CLOSED) && !inc.resolutionTime) {
        updateData.resolutionTime = new Date();
      }

      // Log status transition audit record
      await this.prisma.auditLog.create({
        data: {
          organizationId: this.organizationId,
          actorId: this.request.user?.id || 'system',
          actorEmail: this.request.user?.email || 'analyst@threatsync.local',
          action: 'INCIDENT_STATUS_TRANSITION',
          resourceType: 'INCIDENT',
          resourceId: id,
          requestId: `req_${Date.now().toString(36)}`,
          outcome: 'SUCCESS',
          previousValues: { status: inc.status } as any,
          newValues: { status: newStatus } as any,
        },
      });
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

    // Validate task owner is a member of this organization (prevents cross-tenant ownerId injection)
    let resolvedOwnerName = data.ownerName || null;
    if (data.ownerId) {
      const ownerMembership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: this.organizationId,
            userId: data.ownerId,
          },
        },
        include: { user: { select: { fullName: true } } },
      });
      if (!ownerMembership) {
        throw new BadRequestException(`User '${data.ownerId}' is not a member of this organization`);
      }
      resolvedOwnerName = ownerMembership.user?.fullName ?? resolvedOwnerName;
    }

    return this.prisma.incidentTask.create({
      data: {
        incidentId: id,
        title: data.title,
        ownerId: data.ownerId || null,
        ownerName: resolvedOwnerName,
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
