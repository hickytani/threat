'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AlertInvestigationDetail } from 'shared-types';
import { getAlertInvestigation, updateAlert, getRelatedAlerts, addAlertComment, getOrgMembers } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, SeverityBadge } from '@/components/StateViews';
import {
  ShieldAlert,
  ArrowLeft,
  Server,
  User,
  Globe,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  RotateCcw,
  Send,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function AlertInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = params?.id as string;

  const [alertDetail, setAlertDetail] = useState<AlertInvestigationDetail | any | null>(null);
  const [relatedAlerts, setRelatedAlerts] = useState<any[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Status & Analyst state
  const [updating, setUpdating] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState<string>('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [selectedEventJson, setSelectedEventJson] = useState<any>(null);

  useEffect(() => {
    if (!alertId) return;
    loadAlert();
  }, [alertId]);

  const loadAlert = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, related, members] = await Promise.all([
        getAlertInvestigation(alertId),
        getRelatedAlerts(alertId).catch(() => []),
        getOrgMembers().catch(() => []),
      ]);

      setAlertDetail(data);
      setRelatedAlerts(Array.isArray(related) ? related : []);
      setOrgMembers(Array.isArray(members) ? members : []);
      setSelectedAnalyst(data?.assignedAnalystId || '');
    } catch (err: any) {
      console.error('Failed to load alert investigation detail:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updated = await updateAlert(alertId, { status: newStatus });
      setAlertDetail((prev: any) => ({ ...prev, status: updated.status }));
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignAnalyst = async (analystId: string) => {
    setSelectedAnalyst(analystId);
    setUpdating(true);
    try {
      const updated = await updateAlert(alertId, { assignedAnalystId: analystId || null });
      setAlertDetail((prev: any) => ({
        ...prev,
        assignedAnalystId: updated.assignedAnalystId,
        assignedAnalystName: updated.assignedAnalystName,
      }));
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const newComment = await addAlertComment(alertId, commentText);
      setAlertDetail((prev: any) => ({
        ...prev,
        comments: [newComment, ...(prev?.comments || [])],
      }));
      setCommentText('');
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <LoadingSpinner label="Tracing alert investigation footprint..." />;
  if (error) return <div className="p-6"><ErrorView error={error} onRetry={loadAlert} /></div>;
  if (!alertDetail) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Back Button & Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-900 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Alerts
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={alertDetail.severity} />
            <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-xs text-cyan-400">
              STATUS: {alertDetail.status}
            </span>
            <span className="font-mono text-xs text-slate-500">ID: {alertDetail.id}</span>
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-white">{alertDetail.title}</h1>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {alertDetail.status !== 'INVESTIGATING' && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('INVESTIGATING')}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              Investigate
            </button>
          )}

          {alertDetail.status !== 'RESOLVED' && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('RESOLVED')}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Mark Resolved
            </button>
          )}

          {alertDetail.incidentId && (
            <Link
              href={`/dashboard/incidents/${alertDetail.incidentId}`}
              className="inline-flex items-center gap-2 rounded bg-purple-950/40 border border-purple-800 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-900/60"
            >
              <Terminal className="h-3.5 w-3.5" /> Linked Incident ({alertDetail.incidentId.slice(0, 8)})
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Columns: Alert Footprint & Evidence */}
        <div className="space-y-6 md:col-span-2">
          {/* Detection Logic & Matched Conditions */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
              <ShieldAlert className="h-4 w-4" /> Detection Engine Analysis
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300">Rule Name</div>
              <div className="mt-0.5 text-sm font-bold text-white">
                {alertDetail.detectionRule?.name || alertDetail.title}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300">Detection Reason</div>
              <div className="mt-1 rounded border border-slate-800/80 bg-slate-900/60 p-3 font-mono text-xs leading-relaxed text-slate-300">
                {alertDetail.detectionReason || alertDetail.description}
              </div>
            </div>

            {alertDetail.matchedConditions && Object.keys(alertDetail.matchedConditions).length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold text-slate-300">Matched Detection Conditions</div>
                <pre className="overflow-x-auto rounded border border-slate-900 bg-slate-950 p-3 font-mono text-[10px] text-emerald-400">
                  {JSON.stringify(alertDetail.matchedConditions, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Triggering & Contributing Events */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Activity className="h-4 w-4" /> Contributing Security Events ({alertDetail.contributingEvents?.length || 0})
              </div>
            </div>

            {alertDetail.contributingEvents && alertDetail.contributingEvents.length > 0 ? (
              <div className="space-y-3">
                {alertDetail.contributingEvents.map((evt: any) => (
                  <div key={evt.id} className="space-y-2 rounded border border-slate-800/80 bg-slate-900/30 p-3 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span className="font-bold text-cyan-400">{evt.eventType}</span>
                      <span>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-slate-200">{evt.message}</p>

                    <div className="flex items-center justify-between border-t border-slate-900 pt-2 font-mono text-[10px] text-slate-500">
                      <span>Source: <strong className="text-slate-400">{evt.source}</strong></span>
                      <span>Action: <strong className="text-slate-400">{evt.action}</strong></span>
                      <button
                        onClick={() => setSelectedEventJson(selectedEventJson === evt ? null : evt)}
                        className="text-cyan-400 hover:underline"
                      >
                        {selectedEventJson === evt ? 'Hide Raw Event' : 'View Raw Event'}
                      </button>
                    </div>

                    {selectedEventJson === evt && (
                      <pre className="mt-2 overflow-x-auto rounded border border-slate-900 bg-slate-950 p-2 font-mono text-[10px] text-cyan-300">
                        {evt.rawJson || JSON.stringify(evt.metadata || {}, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center font-mono text-xs text-slate-500">
                No direct contributing event payloads captured for this alert.
              </div>
            )}
          </div>

          {/* Cross-Correlated Related Alerts */}
          {relatedAlerts.length > 0 && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Layers className="h-4 w-4" /> Cross-Correlated Related Alerts ({relatedAlerts.length})
              </div>
              <div className="divide-y divide-slate-800/60">
                {relatedAlerts.map((rel) => (
                  <div key={rel.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <Link href={`/dashboard/alerts/${rel.id}`} className="font-semibold text-white hover:text-cyan-400">
                        {rel.title}
                      </Link>
                      <div className="font-mono text-[10px] text-slate-500">
                        Category: {rel.category} | Severity: {rel.severity}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{new Date(rel.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyst Comments Discussion Feed */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
              <MessageSquare className="h-4 w-4" /> Analyst Investigation Notes
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add investigation comment or note..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Note
              </button>
            </form>

            <div className="space-y-3 pt-2">
              {alertDetail.comments && alertDetail.comments.length > 0 ? (
                alertDetail.comments.map((c: any) => (
                  <div key={c.id} className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span className="font-bold text-white">{c.authorName}</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1.5 text-slate-300">{c.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center font-mono text-xs text-slate-500 py-2">No analyst notes recorded yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Assignment & Entity Context */}
        <div className="space-y-6">
          {/* Analyst Assignment Panel */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <UserCheck className="h-4 w-4 text-cyan-400" /> Analyst Assignment
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-500">Assigned SOC Analyst</label>
              <select
                value={selectedAnalyst}
                onChange={(e) => handleAssignAnalyst(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {orgMembers.map((m: any) => (
                  <option key={m.userId || m.id} value={m.userId || m.id}>
                    {m.user?.fullName || m.fullName || m.email || m.userId} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Current: <strong className="text-white">{alertDetail.assignedAnalystName || 'Unassigned'}</strong>
            </div>
          </div>

          {/* Alert Confidence Score */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Alert Confidence Score</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-cyan-400">{alertDetail.confidenceScore || 90}%</span>
              <span className="font-mono text-xs text-slate-500">High Confidence</span>
            </div>

            <div className="space-y-2 border-t border-slate-900 pt-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Ingestion Source:</span>
                <span className="font-semibold text-white">{alertDetail.source}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Category:</span>
                <span className="font-semibold text-white">{alertDetail.category}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Detection Time:</span>
                <span className="font-mono text-slate-300">{new Date(alertDetail.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Affected Asset Entity */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5"><Server className="h-4 w-4 text-cyan-400" /> Affected Asset</span>
              {alertDetail.assetId && (
                <Link href={`/dashboard/assets/${alertDetail.assetId}`} className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                  View Asset <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>

            {alertDetail.asset ? (
              <div className="space-y-2 text-xs">
                <div className="text-sm font-semibold text-white">{alertDetail.asset.displayName || alertDetail.asset.hostname}</div>
                <div className="font-mono text-xs text-slate-400">IP: {alertDetail.asset.ipAddress}</div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Type: <strong className="text-slate-300">{alertDetail.asset.type}</strong></span>
                  <span>Criticality: <strong className="text-amber-400">{alertDetail.asset.businessCriticality}</strong></span>
                </div>
              </div>
            ) : (
              <div className="font-mono text-xs text-slate-500">No host asset metadata linked.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
