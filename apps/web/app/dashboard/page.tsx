'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  DatabaseZap,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

type DashboardSummary = {
  totalAlerts: number;
  criticalHigh: number;
  openIncidents: number;
  monitoredAssets: number;
  averageAssetRisk: number;
  atRiskAssets: number;
};

const defaultSummary: DashboardSummary = {
  totalAlerts: 0,
  criticalHigh: 0,
  openIncidents: 0,
  monitoredAssets: 0,
  averageAssetRisk: 0,
  atRiskAssets: 0,
};

const toneStyles: Record<string, string> = {
  cyan: 'text-cyan-400',
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  violet: 'text-violet-400',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<DashboardSummary>('/dashboard/summary');
      setSummary(data);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach the ThreatSync API. Confirm the Python backend is running.';

      setError(message);
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const dashboardStats = useMemo(
    () => [
      {
        label: 'TOTAL DETECTIONS',
        value: String(summary.totalAlerts),
        helper: 'Current alert backlog',
        icon: Activity,
        tone: 'cyan',
      },
      {
        label: 'CRITICAL / HIGH',
        value: String(summary.criticalHigh),
        helper: 'Highest-priority signals',
        icon: ShieldAlert,
        tone: 'rose',
      },
      {
        label: 'OPEN INCIDENTS',
        value: String(summary.openIncidents),
        helper: 'Active investigations',
        icon: AlertTriangle,
        tone: 'amber',
      },
      {
        label: 'AVERAGE RISK',
        value: `${Math.round(summary.averageAssetRisk)} / 100`,
        helper: `${summary.atRiskAssets} assets above threshold`,
        icon: DatabaseZap,
        tone: 'violet',
      },
    ],
    [summary],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-400">THREATSYNC OS</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">Security Operations Overview</h1>
        </div>

        <button
          type="button"
          onClick={loadSummary}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-500/70 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
          Refresh Workspace
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map(({ label, value, helper, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-800/80 bg-[#091827]/80 p-5 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
              <Icon className={`h-5 w-5 ${toneStyles[tone]}`} />
            </div>

            <div className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-white">
              {loading ? '—' : value}
            </div>
            <div className="mt-2 text-sm text-slate-400">{helper}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-xl border border-slate-800/80 bg-[#091827]/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Threat posture</div>
            <div className="inline-flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              PROTECTED
            </div>
          </div>

          <h2 className="mt-4 text-[15px] font-semibold text-white">Current operational picture</h2>

          <div className="mt-5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">Operational summary</div>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-200">
              {loading
                ? 'Loading the live SOC telemetry stream...'
                : `The current tenant is reporting ${summary.totalAlerts} detections, ${summary.openIncidents} active incidents, and ${summary.atRiskAssets} assets above risk threshold.`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#091827]/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-white">Monitored assets</h2>
            <div className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-950/70 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              <DatabaseZap className="h-3.5 w-3.5 text-cyan-400" />
              {loading ? 'SYNCING' : `${summary.monitoredAssets} TOTAL`}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-full border-[6px] border-slate-700 bg-slate-950/50" />
            <div className="mt-6 text-[15px] font-semibold text-white">
              {loading ? 'Loading inventory...' : `${summary.monitoredAssets} monitored assets`}
            </div>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              {loading
                ? 'Retrieving latest asset telemetry from the control plane.'
                : `${summary.atRiskAssets} assets are currently above the configured risk threshold.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

