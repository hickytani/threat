'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Alert, Asset, Incident } from 'shared-types';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  DatabaseZap,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { ErrorView, LoadingSpinner } from '@/components/StateViews';
import { apiRequest, getActiveMembership } from '@/lib/api-client';


import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  EmptyState,
  MetricCard,
  PanelHeader,
  SeverityBadge,
  StatusBadge,
} from '@/components/threatsync-ui';

const severityPalette: Record<string, string> = {
  CRITICAL: '#f87171',
  HIGH: '#fb923c',
  MEDIUM: '#fbbf24',
  LOW: '#38bdf8',
  INFORMATIONAL: '#94a3b8',
};

const incidentPalette: Record<string, string> = {
  OPEN: '#38bdf8',
  TRIAGED: '#a78bfa',
  INVESTIGATING: '#22d3ee',
  CONTAINMENT_IN_PROGRESS: '#fb923c',
  CONTAINED: '#34d399',
  REMEDIATION_IN_PROGRESS: '#fbbf24',
  RESOLVED: '#34d399',
  CLOSED: '#64748b',
};

export default function SecurityOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const membership = getActiveMembership();
      if (!membership) {
        setAlerts([]);
        setIncidents([]);
        setAssets([]);
        return;
      }

      const [assetsData, alertsData, incidentsData] = await Promise.all([
        apiRequest<Asset[]>('/assets'),
        apiRequest<Alert[]>('/alerts'),
        apiRequest<Incident[]>('/incidents'),
      ]);

      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
    } catch (err: any) {
      console.error('Error fetching dashboard statistics', err);
      setError(err?.message || 'Unable to load dashboard data.');
      setAlerts([]);
      setIncidents([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const overviewStats = useMemo(() => {
    const criticalHigh = alerts.filter((alert) => ['CRITICAL', 'HIGH'].includes(alert.severity)).length;
    const openIncidents = incidents.filter((incident) => !['RESOLVED', 'CLOSED'].includes(incident.status)).length;
    const averageAssetRisk = assets.length
      ? assets.reduce((sum, asset) => sum + Number(asset.riskScore || 0), 0) / assets.length
      : 0;

    return {
      totalAlerts: alerts.length,
      criticalHigh,
      openIncidents,
      monitoredAssets: assets.length,
      averageAssetRisk,
      atRiskAssets: assets.filter((asset) => Number(asset.riskScore || 0) >= 70).length,
    };
  }, [alerts, incidents, assets]);

  const severityBreakdown = useMemo(
    () =>
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'].map((level) => ({
        name: level,
        value: alerts.filter((alert) => alert.severity === level).length,
        color: severityPalette[level] || '#64748b',
      })),
    [alerts],
  );

  const incidentBreakdown = useMemo(() => {
    const statusOrder = ['OPEN', 'INVESTIGATING', 'CONTAINMENT_IN_PROGRESS', 'REMEDIATION_IN_PROGRESS', 'RESOLVED'];

    return statusOrder
      .map((status) => ({
        name: status.replace(/_/g, ' '),
        value: incidents.filter((incident) => incident.status === status).length,
        color: incidentPalette[status] || '#64748b',
      }))
      .filter((entry) => entry.value > 0);
  }, [incidents]);

  const topAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);
  const topAssets = useMemo(
    () => [...assets].sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0)).slice(0, 5),
    [assets],
  );
  const openingIncidents = useMemo(
    () => incidents.filter((incident) => !['RESOLVED', 'CLOSED'].includes(incident.status)).slice(0, 5),
    [incidents],
  );

  const postureSummary = useMemo(() => {
    if (!alerts.length && !incidents.length && !assets.length) {
      return 'No active detections or incidents are currently visible for this tenant. The control plane is currently quiet.';
    }

    const alertText = overviewStats.totalAlerts
      ? `${overviewStats.totalAlerts} detections are currently visible, including ${overviewStats.criticalHigh} critical/high signals.`
      : 'No current detections are visible.';

    const incidentText = overviewStats.openIncidents
      ? `${overviewStats.openIncidents} investigations remain open for response coordination.`
      : 'No open incident queues are currently active.';

    const assetText = overviewStats.monitoredAssets
      ? `${overviewStats.monitoredAssets} assets are being monitored, with ${overviewStats.atRiskAssets} currently scoring above the risk threshold.`
      : 'No monitored assets are available for this tenant.';

    return `${alertText} ${incidentText} ${assetText}`;
  }, [alerts, incidents, assets, overviewStats]);

  if (loading) {

    return <LoadingSpinner label="Loading ThreatSync OS Overview Data..." />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400">ThreatSync OS</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Security Operations Overview</h1>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-500 hover:text-white"
        >
          <Activity className="h-3.5 w-3.5 text-cyan-400" /> Refresh Workspace
        </button>
      </div>

      {error && <ErrorView error={error} onRetry={fetchDashboardData} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total detections"
          value={overviewStats.totalAlerts}
          helper="Current alert backlog"
          tone="cyan"
          icon={Activity}
        />
        <MetricCard
          label="Critical / high"
          value={overviewStats.criticalHigh}
          helper="Highest-priority signals"
          tone="rose"
          icon={ShieldAlert}
        />
        <MetricCard
          label="Open incidents"
          value={overviewStats.openIncidents}
          helper="Active investigations"
          tone="amber"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Average risk"
          value={`${overviewStats.averageAssetRisk.toFixed(0)}%`}
          helper={`${overviewStats.atRiskAssets} assets above threshold`}
          tone="violet"
          icon={DatabaseZap}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="premium-card rounded-xl border border-slate-800/80 p-5">
          <PanelHeader
            eyebrow="Threat posture"
            title="Current operational picture"
            action={
              <div className="inline-flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Protected
              </div>
            }
          />

          <div className="mt-4 rounded border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">Operational summary</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{postureSummary}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Alert severity mix</div>
              {severityBreakdown.some((entry) => entry.value > 0) ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityBreakdown} barCategoryGap={16}>
                      <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="4 4" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                        contentStyle={{ backgroundColor: '#0b1220', borderColor: '#1e293b', borderRadius: '0.75rem' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {severityBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center text-xs text-slate-500">
                  No alert severity data available.
                </div>
              )}
            </div>

            <div className="rounded border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Incident status</div>
              {incidentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {incidentBreakdown.map((entry) => (
                    <div key={entry.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-300">
                        <span>{entry.name}</span>
                        <span className="font-semibold text-white">{entry.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max((entry.value / Math.max(incidents.length, 1)) * 100, 8)}%`, backgroundColor: entry.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center text-xs text-slate-500">
                  No active incident state data.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="premium-card rounded-xl border border-slate-800/80 p-5">
          <PanelHeader
            eyebrow="Exposure"
            title="Monitored assets"
            action={
              <div className="inline-flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                <TimerReset className="h-3.5 w-3.5 text-cyan-400" /> {overviewStats.monitoredAssets} total
              </div>
            }
          />

          <div className="mt-4 space-y-3">
            {topAssets.length > 0 ? (
              topAssets.map((asset) => (
                <Link key={asset.id} href={`/dashboard/assets/${asset.id}`} className="block rounded border border-slate-800 bg-slate-950/40 p-3 hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white hover:text-cyan-400">{asset.displayName || asset.hostname}</div>
                      <div className="mt-1 font-mono text-[10px] text-slate-400">{asset.hostname}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Risk</div>
                      <div className="text-sm font-semibold text-cyan-300">{Number(asset.riskScore || 0).toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{asset.type}</span>
                    <span>{asset.environment}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500"
                      style={{ width: `${Math.min(Number(asset.riskScore || 0), 100)}%` }}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No assets currently available" description="No asset inventory data could be loaded for this tenant." />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="premium-card rounded-xl border border-slate-800/80 p-5">
          <PanelHeader
            eyebrow="Alert stream"
            title="Latest detections"
            action={<div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{topAlerts.length} visible</div>}
          />

          <div className="mt-4 space-y-3">
            {topAlerts.length > 0 ? (
              topAlerts.map((alert) => (
                <Link key={alert.id} href={`/dashboard/alerts/${alert.id}`} className="block rounded border border-slate-800 bg-slate-950/40 p-3 transition hover:border-cyan-500/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <span className="font-mono text-[10px] text-slate-400">{alert.source}</span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white hover:text-cyan-300">{alert.title}</div>
                    </div>
                    <div className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                    <span className="font-mono">{alert.ipAddress || 'Internal'}</span>
                    <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5">{alert.category}</span>
                    <span>{alert.confidenceScore || 0}% confidence</span>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No detections available"
                description="The current tenant has no visible alerts to render in the stream."
              />
            )}
          </div>
        </div>

        <div className="premium-card rounded-xl border border-slate-800/80 p-5">
          <PanelHeader
            eyebrow="Incident queue"
            title="Open investigations"
            action={<div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Live queue</div>}
          />

          <div className="mt-4 space-y-3">
            {openingIncidents.length > 0 ? (
              openingIncidents.map((incident) => (
                <Link key={incident.id} href={`/dashboard/incidents/${incident.id}`} className="block rounded border border-slate-800 bg-slate-950/40 p-3 hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white hover:text-cyan-300">{incident.title}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{incident.incidentType}</div>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                    <SeverityBadge severity={incident.severity} />
                    <span>{incident.assignedAnalystName || 'Unassigned'}</span>
                    <span className="font-mono">{new Date(incident.detectionTime).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No open incidents"
                description="No active investigations are being tracked for this tenant."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

