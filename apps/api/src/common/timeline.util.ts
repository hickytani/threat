import type { AlertSeverity } from '@prisma/client';

export interface RawTimelineInputs {
  securityEvents?: any[];
  alerts?: any[];
  auditLogs?: any[];
  comments?: any[];
  tasks?: any[];
  iocEnrichments?: any[];
}

export interface TimelineItem {
  id: string;
  timestamp: string;
  type: 'SECURITY_EVENT' | 'ALERT' | 'INCIDENT_TRANSITION' | 'INTELLIGENCE_ACTIVITY' | 'AUDIT_LOG' | 'COMMENT' | 'TASK';
  source: string;
  title: string;
  description: string;
  severity?: AlertSeverity;
  metadata?: Record<string, any>;
  referenceId?: string;
  referenceType?: string;
}

function safeIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function buildDeterministicTimeline(inputs: RawTimelineInputs): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (inputs.securityEvents) {
    for (const evt of inputs.securityEvents) {
      items.push({
        id: `timeline_evt_${evt.id || Math.random().toString(36).substring(7)}`,
        timestamp: safeIsoDate(evt.timestamp || evt.createdAt),
        type: 'SECURITY_EVENT',
        source: evt.source || 'SIEM',
        title: `Security Event: ${evt.eventType || 'Log'}`,
        description: evt.message || `Event action ${evt.action || ''} with outcome ${evt.outcome || ''}`,
        severity: evt.severity,
        metadata: {
          action: evt.action,
          outcome: evt.outcome,
          assetId: evt.assetId,
          sourceIp: evt.sourceIp,
        },
        referenceId: evt.id,
        referenceType: 'SECURITY_EVENT',
      });
    }
  }

  if (inputs.alerts) {
    for (const alert of inputs.alerts) {
      items.push({
        id: `timeline_alt_${alert.id || Math.random().toString(36).substring(7)}`,
        timestamp: safeIsoDate(alert.timestamp || alert.createdAt),
        type: 'ALERT',
        source: alert.source || 'DetectionEngine',
        title: `Alert Triggered: ${alert.title || 'Alert'}`,
        description: alert.description || `Alert in category ${alert.category || 'General'}`,
        severity: alert.severity,
        metadata: {
          category: alert.category,
          status: alert.status,
          assetId: alert.assetId,
        },
        referenceId: alert.id,
        referenceType: 'ALERT',
      });
    }
  }

  if (inputs.auditLogs) {
    for (const log of inputs.auditLogs) {
      const isTransition = log.action === 'INCIDENT_STATUS_TRANSITION' || log.action === 'ALERT_ESCALATION';
      items.push({
        id: `timeline_audit_${log.id || Math.random().toString(36).substring(7)}`,
        timestamp: safeIsoDate(log.timestamp || log.createdAt),
        type: isTransition ? 'INCIDENT_TRANSITION' : 'AUDIT_LOG',
        source: 'AuditTrail',
        title: `Audit Action: ${log.action}`,
        description: `Actor ${log.actorEmail || 'system'} performed ${log.action} on ${log.resourceType || 'resource'} (${log.resourceId || ''})`,
        metadata: {
          actorEmail: log.actorEmail,
          previousValues: log.previousValues,
          newValues: log.newValues,
          outcome: log.outcome,
        },
        referenceId: log.resourceId,
        referenceType: log.resourceType,
      });
    }
  }

  if (inputs.comments) {
    for (const comment of inputs.comments) {
      items.push({
        id: `timeline_comment_${comment.id || Math.random().toString(36).substring(7)}`,
        timestamp: safeIsoDate(comment.createdAt),
        type: 'COMMENT',
        source: comment.authorName || 'Analyst',
        title: `Comment Added by ${comment.authorName || 'Analyst'}`,
        description: comment.content || '',
        metadata: {
          isInternalOnly: comment.isInternalOnly,
          authorId: comment.authorId,
        },
        referenceId: comment.id,
        referenceType: 'INCIDENT_COMMENT',
      });
    }
  }

  if (inputs.tasks) {
    for (const task of inputs.tasks) {
      items.push({
        id: `timeline_task_${task.id || Math.random().toString(36).substring(7)}`,
        timestamp: safeIsoDate(task.createdAt),
        type: 'TASK',
        source: task.ownerName || 'SOC Team',
        title: `Remediation Task: ${task.title}`,
        description: `Status: ${task.status || 'PENDING'}, Priority: ${task.priority || 'MEDIUM'}`,
        severity: task.priority,
        metadata: {
          status: task.status,
          dueDate: task.dueDate,
        },
        referenceId: task.id,
        referenceType: 'INCIDENT_TASK',
      });
    }
  }

  if (inputs.iocEnrichments) {
    for (const enrich of inputs.iocEnrichments) {
      items.push({
        id: `timeline_intel_${enrich.id || Math.random().toString(36).substring(7)}`,
        timestamp: safeIsoDate(enrich.queryTime || enrich.createdAt),
        type: 'INTELLIGENCE_ACTIVITY',
        source: enrich.sourceName || 'ThreatIntel',
        title: `Intelligence Query: ${enrich.sourceName || 'Provider'}`,
        description: `Enrichment query completed with confidence ${enrich.confidence || 100}%`,
        metadata: {
          rawResponse: enrich.rawResponse,
        },
        referenceId: enrich.id,
        referenceType: 'IOC_ENRICHMENT',
      });
    }
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
