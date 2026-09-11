'use client';

import React from 'react';
import { AlertOctagon, RefreshCw, ShieldAlert, Database, Lock, AlertTriangle, Inbox } from 'lucide-react';
import { ApiClientError } from '@/lib/api-client';

export function LoadingSpinner({ label = 'Loading SOC investigation data...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
      <RefreshCw className="h-6 w-6 animate-spin text-cyan-400 mb-3" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorView({ error, onRetry }: { error: any; onRetry?: () => void }) {
  const status = error instanceof ApiClientError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const requestId = error instanceof ApiClientError ? error.requestId : undefined;

  let title = 'System Failure';
  let Icon = ShieldAlert;

  if (status === 401) {
    title = 'Session Expired / Unauthorized';
    Icon = Lock;
  } else if (status === 403) {
    title = 'Access Forbidden (Tenant Isolation / RBAC)';
    Icon = AlertOctagon;
  } else if (status === 404) {
    title = 'Security Resource Not Found';
    Icon = Database;
  }

  return (
    <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-6 text-slate-200 my-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-400">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-rose-300 uppercase tracking-wide">{title}</h4>
          <p className="text-xs text-slate-300 mt-1 font-mono">{message}</p>

          {requestId && (
            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              Request ID: <span className="text-slate-400">{requestId}</span>
            </div>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-3 py-1.5 rounded text-xs font-semibold bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700 text-white flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'No Security Records Found',
  description = 'No matching events, alerts, or entities were retrieved for the specified criteria.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed border-slate-800 bg-slate-950/30 text-center">
      <Inbox className="h-10 w-10 text-slate-600 mb-3" />
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h4>
      <p className="text-xs text-slate-500 max-w-md mt-1">{description}</p>
    </div>
  );
}

export function SeverityBadge({ severity }: { severity?: string }) {
  const sev = (severity || 'LOW').toUpperCase();

  const styles: Record<string, string> = {
    CRITICAL: 'bg-rose-950/80 border-rose-700 text-rose-400',
    HIGH: 'bg-orange-950/80 border-orange-700 text-orange-400',
    MEDIUM: 'bg-amber-950/80 border-amber-700 text-amber-400',
    LOW: 'bg-slate-900 border-slate-700 text-slate-300',
    INFORMATIONAL: 'bg-cyan-950/80 border-cyan-700 text-cyan-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold font-mono uppercase tracking-wider ${
        styles[sev] || styles.LOW
      }`}
    >
      <AlertTriangle className="h-3 w-3" /> {sev}
    </span>
  );
}
