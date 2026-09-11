'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AlertInvestigationDetail } from 'shared-types';
import { getAlertInvestigation } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, SeverityBadge } from '@/components/StateViews';
import {
  ShieldAlert,
  ArrowLeft,
  Server,
  User,
  Globe,
  Terminal,
  FileCode,
  ExternalLink,
  Activity,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  Lock,
} from 'lucide-react';

export default function AlertInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = params?.id as string;

  const [alertDetail, setAlertDetail] = useState<AlertInvestigationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedEventJson, setSelectedEventJson] = useState<any>(null);

  useEffect(() => {
    if (!alertId) return;
    loadAlert();
  }, [alertId]);

  const loadAlert = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAlertInvestigation(alertId);
      setAlertDetail(data);
    } catch (err: any) {
      console.error('Failed to load alert investigation detail:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Tracing alert investigation footprint..." />;
  if (error) return <div className="p-6"><ErrorView error={error} onRetry={loadAlert} /></div>;
  if (!alertDetail) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back Button & Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Alerts
          </button>
          <div className="flex items-center gap-3">
            <SeverityBadge severity={alertDetail.severity} />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              STATUS: {alertDetail.status}
            </span>
            <span className="text-xs font-mono text-slate-500">ID: {alertDetail.id}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">{alertDetail.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {alertDetail.incidentId && (
            <Link
              href={`/dashboard/incidents/${alertDetail.incidentId}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-purple-950/40 border border-purple-800 text-purple-300 text-xs font-semibold hover:bg-purple-900/60 transition-colors"
            >
              <Terminal className="h-4 w-4" /> View Linked Incident ({alertDetail.incidentId})
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Columns: Alert Footprint & Evidence */}
        <div className="md:col-span-2 space-y-6">
          {/* Detection Logic & Matched Conditions */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-3">
              <ShieldAlert className="h-4 w-4" /> Detection Engine Analysis
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300">Rule Name</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {alertDetail.detectionRule?.name || alertDetail.title}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300">Detection Reason</div>
              <div className="text-xs text-slate-300 mt-1 bg-slate-900/60 border border-slate-800/80 p-3 rounded leading-relaxed font-mono">
                {alertDetail.detectionReason || alertDetail.description}
              </div>
            </div>

            {alertDetail.matchedConditions && Object.keys(alertDetail.matchedConditions).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">Matched Detection Conditions</div>
                <pre className="p-3 rounded bg-slate-950 border border-slate-900 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(alertDetail.matchedConditions, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Triggering & Contributing Events */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Activity className="h-4 w-4" /> Contributing Security Events ({alertDetail.contributingEvents?.length || 0})
              </div>
            </div>

            {alertDetail.contributingEvents && alertDetail.contributingEvents.length > 0 ? (
              <div className="space-y-3">
                {alertDetail.contributingEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded border border-slate-800/80 bg-slate-900/30 text-xs space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span className="text-cyan-400 font-bold">{evt.eventType}</span>
                      <span>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>

                    <p className="text-slate-200 text-xs">{evt.message}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900">
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
                      <pre className="mt-2 p-2 rounded bg-slate-950 border border-slate-900 text-[10px] font-mono text-cyan-300 overflow-x-auto">
                        {evt.rawJson || JSON.stringify(evt.metadata || {}, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono p-4 text-center">
                No direct contributing event payloads captured for this alert.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Entities & Relationships */}
        <div className="space-y-6">
          {/* Confidence Score & Source */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Alert Confidence Score</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-cyan-400">{alertDetail.confidenceScore || 90}%</span>
              <span className="text-xs text-slate-500 font-mono">High Confidence</span>
            </div>

            <div className="pt-3 border-t border-slate-900 text-xs space-y-2">
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
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              <span className="flex items-center gap-1.5"><Server className="h-4 w-4 text-cyan-400" /> Affected Asset</span>
              {alertDetail.assetId && (
                <Link href={`/dashboard/assets/${alertDetail.assetId}`} className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]">
                  View Asset <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>

            {alertDetail.asset ? (
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-white text-sm">{alertDetail.asset.displayName || alertDetail.asset.hostname}</div>
                <div className="font-mono text-slate-400 text-xs">IP: {alertDetail.asset.ipAddress}</div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Type: <strong className="text-slate-300">{alertDetail.asset.type}</strong></span>
                  <span>Criticality: <strong className="text-amber-400">{alertDetail.asset.businessCriticality}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No host asset metadata linked.</div>
            )}
          </div>

          {/* Actor / User Identity */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              <User className="h-4 w-4 text-cyan-400" /> Actor / User Identity
            </div>

            <div className="text-xs font-mono text-slate-300">
              {alertDetail.userIdentity || alertDetail.assignedAnalystName || 'Unknown Actor / System Principal'}
            </div>
          </div>

          {/* Network & IOC Footprint */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-cyan-400" /> Network / IOC Footprint</span>
              {alertDetail.ioc && (
                <Link href={`/dashboard/ioc/${alertDetail.ioc.id}`} className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]">
                  View IOC <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              {alertDetail.ipAddress && (
                <div className="flex justify-between">
                  <span className="text-slate-500">IP Address:</span>
                  <span className="text-cyan-400 font-semibold">{alertDetail.ipAddress}</span>
                </div>
              )}
              {alertDetail.domain && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Domain:</span>
                  <span className="text-cyan-400 font-semibold">{alertDetail.domain}</span>
                </div>
              )}
              {alertDetail.fileHash && (
                <div className="flex justify-between truncate">
                  <span className="text-slate-500">File Hash:</span>
                  <span className="text-cyan-400 font-semibold truncate ml-2">{alertDetail.fileHash}</span>
                </div>
              )}
              {!alertDetail.ipAddress && !alertDetail.domain && !alertDetail.fileHash && (
                <div className="text-slate-500 text-[11px]">No external network or hash indicators attached.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
