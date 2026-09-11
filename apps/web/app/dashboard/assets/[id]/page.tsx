'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AssetInvestigationDetail } from 'shared-types';
import { getAssetInvestigation, getAssetTimeline } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, SeverityBadge, EmptyState } from '@/components/StateViews';
import { InvestigationTimeline } from '@/components/InvestigationTimeline';
import {
  Server,
  ArrowLeft,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Terminal,
  ExternalLink,
  Cpu,
  Database,
  Lock,
} from 'lucide-react';

export default function AssetInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params?.id as string;

  const [assetDetail, setAssetDetail] = useState<AssetInvestigationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!assetId) return;
    loadAsset();
  }, [assetId]);

  const loadAsset = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssetInvestigation(assetId);
      setAssetDetail(data);
    } catch (err: any) {
      console.error('Failed to load asset investigation details:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Evaluating asset posture and risk contributors..." />;
  if (error) return <div className="p-6"><ErrorView error={error} onRetry={loadAsset} /></div>;
  if (!assetDetail) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Assets
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
              TYPE: {assetDetail.type}
            </span>
            <span className="text-xs font-mono text-slate-400">CRITICALITY: {assetDetail.businessCriticality}</span>
            <span className="text-xs font-mono text-slate-500">ENV: {assetDetail.environment}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">
            {assetDetail.displayName || assetDetail.hostname}
          </h1>
          <div className="text-xs font-mono text-slate-400 mt-1">Hostname: {assetDetail.hostname} | IP: {assetDetail.ipAddress}</div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calculated Risk Score</div>
            <div className="text-2xl font-extrabold text-cyan-400">{assetDetail.riskScore || assetDetail.riskSummary?.score || 0}%</div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Columns: Risk Contributors & Detections */}
        <div className="md:col-span-2 space-y-6">
          {/* Explainable Risk Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Explainable Risk Breakdown
            </h3>

            {assetDetail.riskSummary?.contributors && assetDetail.riskSummary.contributors.length > 0 ? (
              <div className="space-y-3">
                {assetDetail.riskSummary.contributors.map((contrib, idx) => (
                  <div key={idx} className="p-3 rounded border border-slate-800 bg-slate-900/30 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>{contrib.label}</span>
                      <span className="text-cyan-400 font-mono">+{contrib.score} pts</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{contrib.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No elevated risk contributors recorded for this asset.</div>
            )}
          </div>

          {/* Active Detections & Incidents */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Active Detections & Incidents ({assetDetail.alerts?.length || 0} Alerts, {assetDetail.incidents?.length || 0} Incidents)
            </h3>

            {assetDetail.alerts && assetDetail.alerts.length > 0 ? (
              <div className="space-y-3">
                {assetDetail.alerts.map((alrt) => (
                  <Link
                    key={alrt.id}
                    href={`/dashboard/alerts/${alrt.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{alrt.title}</span>
                      <SeverityBadge severity={alrt.severity} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">Category: {alrt.category} | Source: {alrt.source}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No active alerts linked to this asset.</div>
            )}
          </div>

          {/* Chronological Asset Timeline */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
              Asset Security Activity Timeline
            </h3>
            <InvestigationTimeline items={assetDetail.timeline || []} />
          </div>
        </div>

        {/* Right Column: Vulnerabilities & IOC Relationships */}
        <div className="space-y-6">
          {/* Open Vulnerabilities */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              Open Vulnerabilities ({assetDetail.vulnerabilities?.length || 0})
            </h3>
            {assetDetail.vulnerabilities && assetDetail.vulnerabilities.length > 0 ? (
              <div className="space-y-3">
                {assetDetail.vulnerabilities.map((vuln) => (
                  <div key={vuln.id} className="p-3 rounded border border-slate-800 bg-slate-900/30 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold text-rose-400">
                      <span>{vuln.cveId}</span>
                      <span>Status: {vuln.status}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">{vuln.vulnerability?.title || 'CVE Vulnerability'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No open vulnerability findings for this asset.</div>
            )}
          </div>

          {/* Related IOCs */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              Observed Threat IOCs ({assetDetail.relatedIocs?.length || 0})
            </h3>
            {assetDetail.relatedIocs && assetDetail.relatedIocs.length > 0 ? (
              <div className="space-y-3">
                {assetDetail.relatedIocs.map((ioc) => (
                  <Link
                    key={ioc.id}
                    href={`/dashboard/ioc/${ioc.id}`}
                    className="block p-3 rounded border border-slate-800 bg-slate-900/30 hover:border-cyan-500/50 transition-colors text-xs"
                  >
                    <div className="font-mono text-cyan-400 font-bold">{ioc.value}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Type: {ioc.type} | Score: {ioc.reputationScore}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No threat intelligence IOCs associated with this asset.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
