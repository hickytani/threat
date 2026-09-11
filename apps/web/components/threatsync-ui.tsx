import React from 'react';
import type { LucideIcon } from 'lucide-react';

const severityClassMap: Record<string, string> = {
  CRITICAL: 'border-red-500/30 bg-red-500/10 text-red-300',
  HIGH: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  MEDIUM: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  LOW: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  INFORMATIONAL: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

const statusClassMap: Record<string, string> = {
  NEW: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  INVESTIGATING: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  ESCALATED: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  CONTAINED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  RESOLVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  CLOSED: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  OPEN: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  TRIAGED: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  REMEDIATED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REMEDIATION_IN_PROGRESS: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  CONTAINMENT_IN_PROGRESS: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  MONITORING: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  FALSE_POSITIVE: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  SUPPRESSED: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

export function SeverityBadge({ severity, className = '' }: { severity?: string; className?: string }) {
  if (!severity) return null;

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${severityClassMap[severity] || 'border-slate-500/30 bg-slate-500/10 text-slate-300'} ${className}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status, className = '' }: { status?: string; className?: string }) {
  if (!status) return null;

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${statusClassMap[status] || 'border-slate-500/30 bg-slate-500/10 text-slate-300'} ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  tone = 'cyan',
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'cyan' | 'rose' | 'amber' | 'emerald' | 'violet';
  icon?: LucideIcon;
}) {
  const toneMap = {
    cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-300',
  };

  return (
    <div className={`premium-card rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
        </div>
        {Icon && <Icon className="h-6 w-6 opacity-75" />}
      </div>
      {helper && <div className="mt-3 text-[10px] text-slate-400">{helper}</div>}
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
      <div>
        {eyebrow && <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="premium-card rounded-xl border border-slate-800/80 p-8 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-slate-700 bg-slate-950/60 text-slate-400" />
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-xs text-slate-400">{description}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
