'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { IocInvestigationDetail } from 'shared-types';
import { getIocInvestigation } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, SeverityBadge } from '@/components/StateViews';
import { InvestigationTimeline } from '@/components/InvestigationTimeline';
import {
  ShieldAlert,
  ArrowLeft,
  Globe,
  BrainCircuit,
  Activity,
  Server,
  Terminal,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function IocInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const iocId = params?.id as string;

  const [detail, setDetail] = useState<IocInvestigationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!iocId) return;
    loadIoc();
  }, [iocId]);

  const loadIoc = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIocInvestigation(iocId);
      setDetail(data);
    } catch (err: any) {
      console.error('Failed to load IOC investigation detail:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Tracing threat intelligence IOC footprint..." />;
  if (error) return <div className="p-6"><ErrorView error={error} onRetry={loadIoc} /></div>;
  if (!detail) return null;

  const localIntel = detail.intelligenceResult?.local;
  const externalIntel = detail.intelligenceResult?.external;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to IOC Registry
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
              TYPE: {detail.type}
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
              detail.label === 'MALICIOUS' ? 'bg-rose-950/80 border-rose-700 text-rose-400' : 'bg-amber-950/80 border-amber-700 text-amber-400'
            }`}>
              REPUTATION: {detail.label} ({detail.reputationScore}/100)
            </span>
            <span className="text-xs font-mono text-slate-500">ID: {detail.id}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2 font-mono">{detail.value}</h1>
        </div>

        <div className="text-right text-xs font-mono text-slate-400">
          <div>First Observed: {new Date(detail.firstObserved).toLocaleDateString()}</div>
          <div>Last Observed: {new Date(detail.lastObserved).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Columns: Intelligence Distinction & Footprint */}
        <div className="md:col-span-2 space-y-6">
          {/* Intelligence Sources Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* LOCAL INTELLIGENCE */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> LOCAL INTELLIGENCE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold">VERIFIED</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {localIntel?.message || `Found in tenant detection database with ${detail.detectionCount || 0} observations.`}
              </p>
              <div className="text-[11px] font-mono text-slate-400 space-y-1 pt-2 border-t border-slate-900">
                <div>Confidence: <strong className="text-white">{localIntel?.confidence || 85}%</strong></div>
                <div>Source: <strong className="text-white">{localIntel?.source || 'Tenant Sensor Feeds'}</strong></div>
              </div>
            </div>

            {/* EXTERNAL INTELLIGENCE */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <BrainCircuit className="h-4 w-4" /> EXTERNAL INTELLIGENCE
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  externalIntel?.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-400'
                }`}>
                  {externalIntel?.status || 'UNAVAILABLE'}
                </span>
              </div>
              
              {externalIntel?.status === 'SUCCESS' ? (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enriched via {externalIntel.provider}. Confidence Score: {externalIntel.confidence}%. Risk Score: {externalIntel.risk}%.
                </p>
              ) : (
                <div className="p-3 rounded bg-amber-950/20 border border-amber-900/40 text-amber-300 text-xs font-mono">
                  External threat intelligence provider unreachable or API key unconfigured. Displaying local telemetry only.
                </div>
              )}
            </div>
          </div>

          {/* Observed Events & Detections */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Correlated Detections & Alerts ({detail.alerts?.length || 0})
            </h3>
            {detail.alerts && detail.alerts.length > 0 ? (
              <div className="space-y-3">
                {detail.alerts.map((alrt) => (
                  <Link
                    key={alrt.id}
                    href={`/dashboard/alerts/${alrt.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{alrt.title}</span>
                      <SeverityBadge severity={alrt.severity} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">Category: {alrt.category} | IP: {alrt.ipAddress}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No active alerts linked directly to this IOC value.</div>
            )}
          </div>

          {/* IOC Activity Timeline */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              IOC Activity & Observation Timeline
            </h3>
            <InvestigationTimeline items={detail.timeline || []} />
          </div>
        </div>

        {/* Right Column: Affected Assets & Incidents */}
        <div className="space-y-6">
          {/* Linked Incidents */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              Linked Incidents ({detail.incidents?.length || 0})
            </h3>
            {detail.incidents && detail.incidents.length > 0 ? (
              <div className="space-y-3">
                {detail.incidents.map((inc) => (
                  <Link
                    key={inc.id}
                    href={`/dashboard/incidents/${inc.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors text-xs"
                  >
                    <div className="font-bold text-white">{inc.title}</div>
                    <div className="text-[10px] font-mono text-cyan-400 mt-1">Status: {inc.status}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No active incidents linked to this IOC.</div>
            )}
          </div>

          {/* Affected Assets */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              Affected Assets ({detail.affectedAssets?.length || 0})
            </h3>
            {detail.affectedAssets && detail.affectedAssets.length > 0 ? (
              <div className="space-y-3">
                {detail.affectedAssets.map((ast) => (
                  <Link
                    key={ast.id}
                    href={`/dashboard/assets/${ast.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors text-xs"
                  >
                    <div className="font-bold text-white">{ast.displayName || ast.hostname}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">IP: {ast.ipAddress} | Risk: {ast.riskScore}%</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No assets observed interacting with this IOC.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
