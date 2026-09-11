'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Lock, Activity, RefreshCw } from 'lucide-react';
import { apiRequest, getActiveMembership } from '@/lib/api-client';

export default function ComplianceAuditor() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const membership = getActiveMembership();
      if (!membership) {
        setLogs([]);
        return;
      }

      const data = await apiRequest<any[]>('/audit-logs');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400" /> Immutable Compliance Audit Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            System audit trail capturing all platform logins, API key invocations, analyst assignments, and threat status modifications.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="text-xs font-semibold p-1.5 rounded border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Ledger Table */}
      <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/20">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0b0f19] border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Audit Action</th>
              <th className="px-4 py-3">Actor Email</th>
              <th className="px-4 py-3">Resource Type</th>
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 font-mono text-[11px] text-slate-400">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  <Activity className="h-4 w-4 animate-spin mx-auto text-cyan-400 mb-1" /> Querying compliance ledger...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">No recorded compliance logs.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/25">
                  <td className="px-4 py-3 font-semibold text-white">{log.action}</td>
                  <td className="px-4 py-3">{log.actorEmail || 'sarah.analyst@threatsync.local'}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500">{log.resourceType}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500">{log.requestId}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> {log.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-right">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
