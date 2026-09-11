'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Lock, Activity, RefreshCw, ExternalLink, Search } from 'lucide-react';
import { getAuditLogs, getActiveMembership } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, EmptyState } from '@/components/StateViews';

export default function ComplianceAuditor() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const membership = getActiveMembership();
      if (!membership) {
        setLogs([]);
        return;
      }

      const data = await getAuditLogs({ search });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getResourceLink = (type?: string, id?: string) => {
    if (!id) return null;
    let href = '';
    switch (type?.toUpperCase()) {
      case 'INCIDENT':
        href = `/dashboard/incidents/${id}`;
        break;
      case 'ALERT':
        href = `/dashboard/alerts/${id}`;
        break;
      case 'ASSET':
        href = `/dashboard/assets/${id}`;
        break;
      case 'IOC':
      case 'INTELLIGENCE':
        href = `/dashboard/ioc/${id}`;
        break;
      case 'SECURITY_EVENT':
        href = `/dashboard/explorer?id=${id}`;
        break;
      default:
        break;
    }

    if (!href) return <span className="text-[10px] text-slate-500 font-mono">{id}</span>;

    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400 hover:underline"
      >
        <span>{id}</span>
        <ExternalLink className="h-2.5 w-2.5" />
      </Link>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400 h-5 w-5" /> Audit Log Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            System audit records capturing platform actions, analyst state transitions, queue escalations, and event ingestions.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="text-xs font-semibold p-2 rounded border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Audit Trail
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search action, actor email, or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>
        <button
          onClick={fetchAuditLogs}
          className="px-4 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
        >
          Query Trail
        </button>
      </div>

      {error && <ErrorView error={error} onRetry={fetchAuditLogs} />}

      {/* Audit Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0b0f19] border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Audit Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Resource Type / ID</th>
              <th className="px-4 py-3">Request Tracing ID</th>
              <th className="px-4 py-3 text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-[11px] text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12"><LoadingSpinner label="Querying audit trail..." /></td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8"><EmptyState title="No audit logs found" description="No system audit records match the current query criteria." /></td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-cyan-400">{log.action}</td>
                  <td className="px-4 py-3 text-slate-300">{log.actorEmail || log.actorId}</td>
                  <td className="px-4 py-3">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{log.resourceType}</div>
                    <div>{getResourceLink(log.resourceType, log.resourceId)}</div>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-500">{log.requestId}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.outcome === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {log.outcome}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
