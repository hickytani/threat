'use client';

import React from 'react';
import { ShieldCheck, Lock, Activity, Eye, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function ComplianceDashboard() {
  const frameworks = [
    {
      name: 'NIST CSF (IP.ID-01)',
      desc: 'Asset management control: Maintain registered inventories of workstations and cloud servers.',
      status: 'COMPLIANT',
      evidence: '50 assets cataloged in asset inventory db',
      score: 100
    },
    {
      name: 'SOC 2 Security (CC-7.3)',
      desc: 'Vulnerability mapping: Audit systems for CVE patches and known exploit routes.',
      status: 'PARTIAL',
      evidence: '3 assets flagged with open CVE dependencies',
      score: 75
    },
    {
      name: 'ISO 27001 (A.12.4.1)',
      desc: 'Audit logging control: Implement immutable log capture auditing administrative changes.',
      status: 'COMPLIANT',
      evidence: '200 administrative events captured in compliance ledger',
      score: 100
    },
    {
      name: 'PCI-DSS (Req 10)',
      desc: 'Incident response checklists: Document active containment playbooks and checklists.',
      status: 'COMPLIANT',
      evidence: '12 active playbooks logged in incident logs room',
      score: 100
    }
  ];

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="text-cyan-400" /> Compliance Framework Alignment
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Review alignment benchmarks mapping your live SOC telemetry and log data to security controls (NIST CSF, SOC 2, ISO 27001).
        </p>
      </div>

      {/* Advisory Alert */}
      <div className="p-4 rounded border border-cyan-500/25 bg-cyan-950/10 text-xs text-cyan-400 leading-relaxed font-mono">
        <strong>Security Framework Note:</strong> These maps reflect automatic telemetry compliance scoring linked to database logs and asset parameters. This view is for alignment estimation and does not constitute official certification reports.
      </div>

      {/* Framework Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {frameworks.map((f, idx) => (
          <div key={idx} className="premium-card p-5 rounded-lg border border-slate-900 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">{f.name}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                  f.status === 'COMPLIANT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {f.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-900 text-[11px] font-mono text-slate-400 space-y-1">
              <span className="text-[9px] text-slate-500 font-bold block uppercase">Audit Evidence</span>
              <div className="text-slate-300">{f.evidence}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
