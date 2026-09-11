'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { IncidentInvestigationDetail } from 'shared-types';
import { getIncidentInvestigation, updateIncidentStatus, addIncidentComment } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, SeverityBadge } from '@/components/StateViews';
import { InvestigationTimeline } from '@/components/InvestigationTimeline';
import {
  Terminal,
  ArrowLeft,
  Clock,
  User,
  Shield,
  AlertTriangle,
  Server,
  Activity,
  MessageSquare,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  Send,
  Lock,
} from 'lucide-react';

export default function IncidentInvestigationConsole() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params?.id as string;

  const [detail, setDetail] = useState<IncidentInvestigationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence' | 'risk' | 'response'>('timeline');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!incidentId) return;
    loadIncident();
  }, [incidentId]);

  const loadIncident = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidentInvestigation(incidentId);
      setDetail(data);
    } catch (err: any) {
      console.error('Failed to load incident investigation details:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!detail) return;
    setUpdatingStatus(true);
    try {
      await updateIncidentStatus(detail.id, newStatus);
      await loadIncident();
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !detail) return;
    setSubmittingComment(true);
    try {
      await addIncidentComment(detail.id, newComment.trim());
      setNewComment('');
      await loadIncident();
    } catch (err: any) {
      alert(`Posting comment failed: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <LoadingSpinner label="Compiling incident investigation matrix..." />;
  if (error) return <div className="p-6"><ErrorView error={error} onRetry={loadIncident} /></div>;
  if (!detail) return null;

  const allowedNextStatuses: Record<string, string[]> = {
    OPEN: ['TRIAGED', 'INVESTIGATING', 'CLOSED'],
    TRIAGED: ['INVESTIGATING', 'CONTAINMENT_IN_PROGRESS', 'CLOSED'],
    INVESTIGATING: ['CONTAINMENT_IN_PROGRESS', 'CONTAINED', 'CLOSED'],
    CONTAINMENT_IN_PROGRESS: ['CONTAINED', 'REMEDIATION_IN_PROGRESS', 'CLOSED'],
    CONTAINED: ['REMEDIATION_IN_PROGRESS', 'MONITORING', 'RESOLVED', 'CLOSED'],
    REMEDIATION_IN_PROGRESS: ['MONITORING', 'RESOLVED', 'CLOSED'],
    MONITORING: ['RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
  };

  const nextStatuses = allowedNextStatuses[detail.status] || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Incidents
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={detail.severity} />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
              STATUS: {detail.status}
            </span>
            <span className="text-xs font-mono text-slate-500">TYPE: {detail.incidentType}</span>
            <span className="text-xs font-mono text-slate-500">ID: {detail.id}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">{detail.title}</h1>
        </div>

        {/* Assigned Analyst & SLA */}
        <div className="flex flex-col text-right font-mono text-xs space-y-1">
          <div className="text-slate-400">
            Assigned Analyst: <span className="text-white font-bold">{detail.assignedAnalystName || 'Unassigned'}</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Detection Time: {new Date(detail.detectionTime).toLocaleString()}
          </div>
          {detail.slaDeadline && (
            <div className="text-amber-400 text-[10px]">
              SLA Deadline: {new Date(detail.slaDeadline).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 leading-relaxed text-xs text-slate-300">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Executive Summary</div>
        {detail.summary}
      </div>

      {/* Console Tab Navigation */}
      <div className="flex border-b border-slate-900 gap-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'timeline'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Timeline & Footprint ({detail.timeline?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'evidence'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Detection Evidence ({detail.alerts?.length || 0} Alerts, {detail.triggeringEvents?.length || 0} Events)
        </button>

        <button
          onClick={() => setActiveTab('risk')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'risk'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Assets & Vulnerabilities ({detail.affectedAssets?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('response')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'response'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Response Controls & Audit
        </button>
      </div>

      {/* TAB 1: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="py-2">
          <InvestigationTimeline items={detail.timeline || []} />
        </div>
      )}

      {/* TAB 2: EVIDENCE */}
      {activeTab === 'evidence' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Related Detections / Alerts */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Triggering Alerts & Rules ({detail.alerts?.length || 0})
            </h3>
            {detail.alerts && detail.alerts.length > 0 ? (
              <div className="space-y-3">
                {detail.alerts.map((alrt) => (
                  <Link
                    key={alrt.id}
                    href={`/dashboard/alerts/${alrt.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{alrt.title}</span>
                      <SeverityBadge severity={alrt.severity} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{alrt.description}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2">
                      <span>Source: {alrt.source}</span>
                      <span className="text-cyan-400 flex items-center gap-1">Investigate Alert <ExternalLink className="h-2.5 w-2.5" /></span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No linked alerts in evidence list.</div>
            )}
          </div>

          {/* Triggering Events */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Raw Security Events ({detail.triggeringEvents?.length || 0})
            </h3>
            {detail.triggeringEvents && detail.triggeringEvents.length > 0 ? (
              <div className="space-y-3">
                {detail.triggeringEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded border border-slate-800 bg-slate-900/30 text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span className="text-cyan-400">{evt.eventType}</span>
                      <span>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-white font-semibold">{evt.message}</div>
                    <div className="text-[10px] text-slate-500">Source: {evt.source} | Outcome: {evt.outcome}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No raw security events captured directly.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RISK & ASSETS */}
      {activeTab === 'risk' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Affected Assets */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Affected Assets ({detail.affectedAssets?.length || 0})
            </h3>
            {detail.affectedAssets && detail.affectedAssets.length > 0 ? (
              <div className="space-y-3">
                {detail.affectedAssets.map((ast) => (
                  <Link
                    key={ast.id}
                    href={`/dashboard/assets/${ast.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{ast.displayName || ast.hostname}</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">Risk: {ast.riskScore}%</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">IP: {ast.ipAddress} | Type: {ast.type}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No asset records associated.</div>
            )}
          </div>

          {/* IOCs & Vulnerabilities */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Linked IOC Indicators ({detail.iocs?.length || 0})
            </h3>
            {detail.iocs && detail.iocs.length > 0 ? (
              <div className="space-y-3">
                {detail.iocs.map((ioc) => (
                  <Link
                    key={ioc.id}
                    href={`/dashboard/ioc/${ioc.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white font-mono">
                      <span>{ioc.value}</span>
                      <span className="text-rose-400 text-[10px] font-bold">{ioc.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Type: {ioc.type} | Detections: {ioc.detectionCount}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No threat intelligence IOCs attached.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RESPONSE CONTROLS & AUDIT */}
      {activeTab === 'response' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Lifecycle State Transitions */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Incident Lifecycle Controls
            </h3>
            <div className="text-xs text-slate-400 font-mono">
              Current State: <strong className="text-cyan-300 font-bold">{detail.status}</strong>
            </div>

            {nextStatuses.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">Available Safe Transitions:</div>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((st) => (
                    <button
                      key={st}
                      disabled={updatingStatus}
                      onClick={() => handleStatusTransition(st)}
                      className="px-3 py-1.5 rounded border border-cyan-800 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 font-semibold text-xs font-mono transition-colors disabled:opacity-50"
                    >
                      Transition to {st}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">Incident is in terminal state ({detail.status}).</div>
            )}

            {/* Post Comment Box */}
            <form onSubmit={handlePostComment} className="pt-4 border-t border-slate-900 space-y-3">
              <div className="text-xs font-bold text-slate-300">Add Analyst Investigation Note</div>
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter investigation observation or containment evidence..."
                className="w-full rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-4 py-2 rounded bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> {submittingComment ? 'Posting...' : 'Post Investigation Note'}
              </button>
            </form>
          </div>

          {/* Audit History Log */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Relevant Audit Log History ({detail.auditHistory?.length || 0})
            </h3>
            {detail.auditHistory && detail.auditHistory.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {detail.auditHistory.map((aud) => (
                  <div key={aud.id} className="p-2.5 rounded border border-slate-800 bg-slate-900/40 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span className="text-purple-400 font-bold">{aud.action}</span>
                      <span>{new Date(aud.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300">Actor: {aud.actorEmail || aud.actorId}</div>
                    <div className="text-[10px] text-slate-500 truncate">ReqID: {aud.requestId}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No direct audit log history attached.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
