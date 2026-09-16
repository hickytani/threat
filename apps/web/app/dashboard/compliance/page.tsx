'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Activity, Eye, FileText, CheckCircle2, AlertOctagon, Loader2 } from 'lucide-react';
import { apiRequest, getActiveMembership } from '@/lib/api-client';

interface DashboardSummary {
  totalAlerts: number;
  criticalHigh: number;
  openIncidents: number;
  monitoredAssets: number;
  averageAssetRisk: number;
  atRiskAssets: number;
  eventsReceived: number;
  lastEventAt: string | null;
}

export default function ComplianceDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComplianceData() {
      try {
        const membership = getActiveMembership();
        if (!membership) {
          setLoading(false);
          return;
        }
        const data = await apiRequest<DashboardSummary>('/dashboard/summary');
        setSummary(data);
      } catch (err) {
        console.error('Failed to load compliance summary:', err);
      } finally {
        setLoading(false);
      }
    }

    loadComplianceData();
  }, []);

  const monitoredAssets = summary?.monitoredAssets ?? 0;
  const eventsReceived = summary?.eventsReceived ?? 0;
  const openIncidents = summary?.openIncidents ?? 0;
  const atRiskAssets = summary?.atRiskAssets ?? 0;

  const frameworks = [
    {
      name: 'NIST CSF (IP.ID-01)',
      desc: 'Asset management control: Maintain registered inventories of workstations and server nodes.',
      status: monitoredAssets > 0 ? 'COMPLIANT' : 'ACTION_REQUIRED',
      evidence: `${monitoredAssets} assets cataloged in inventory database`,
    },
    {
      name: 'SOC 2 Security (CC-7.3)',
      desc: 'Vulnerability and risk mapping: Audit systems for high-risk posture and critical alert footprint.',
      status: atRiskAssets === 0 && monitoredAssets > 0 ? 'COMPLIANT' : atRiskAssets > 0 ? 'REVIEW_NEEDED' : 'INITIALIZING',
      evidence: `${atRiskAssets} high-risk assets identified out of ${monitoredAssets} cataloged nodes`,
    },
    {
      name: 'ISO 27001 (A.12.4.1)',
      desc: 'Audit logging control: Implement immutable log capture auditing administrative and system events.',
      status: eventsReceived > 0 ? 'COMPLIANT' : 'PENDING_TELEMETRY',
      evidence: `${eventsReceived} security telemetry events recorded in tamper-evident ledger`,
    },
    {
      name: 'PCI-DSS (Req 10)',
      desc: 'Incident response and containment: Active operational incident tracking and triage playbooks.',
      status: openIncidents === 0 ? 'COMPLIANT' : 'ACTIVE_RESPONSE',
      evidence: `${openIncidents} active incident tickets undergoing analyst investigation`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="text-cyan-400" /> Compliance Framework Alignment
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time alignment benchmarks dynamically evaluated from your active SOC telemetry, asset records, and incident ledgers.
        </p>
      </div>

      {/* Advisory Alert */}
      <div className="p-4 rounded border border-cyan-500/25 bg-cyan-950/10 text-xs text-cyan-400 leading-relaxed font-mono">
        <strong>Security Framework Note:</strong> These indicators are dynamically derived from your active tenant database. They reflect observed SOC posture and do not replace formal accredited third-party audit certifications.
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-2" />
          Evaluating live compliance telemetry...
        </div>
      ) : (
        /* Framework Cards */
        <div className="grid md:grid-cols-2 gap-4">
          {frameworks.map((f, idx) => {
            const isSuccess = f.status === 'COMPLIANT';
            const isWarning = f.status === 'REVIEW_NEEDED' || f.status === 'ACTIVE_RESPONSE';

            return (
              <div key={idx} className="premium-card p-5 rounded-lg border border-slate-900 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{f.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                      isSuccess
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isWarning
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {f.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-900 text-[11px] font-mono text-slate-400 space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Live Audit Evidence</span>
                  <div className="text-slate-300">{f.evidence}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
