'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, Filter } from 'lucide-react';
import { getNotificationHistory } from '@/lib/api-client';

export default function NotificationHistoryPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotificationHistory({ status: statusFilter || undefined });
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification delivery history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'SENDING':
      case 'QUEUED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400">NOTIFICATION DISPATCH LEDGER</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Outbound Delivery Audit History</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time delivery status tracking for outbound webhook notification dispatches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="QUEUED">Queued</option>
          </select>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-xl">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Delivery ID / Policy</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Destination URL</th>
              <th className="px-4 py-3">HTTP Response</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">Loading notification delivery ledger...</td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">No notification deliveries recorded yet.</td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{d.id.slice(0, 18)}...</div>
                    <div className="text-[10px] text-cyan-400">{d.policy?.name || 'Manual Alert Webhook'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(d.status)}`}>
                      {d.status === 'DELIVERED' && <CheckCircle className="h-3 w-3 text-emerald-400" />}
                      {d.status === 'FAILED' && <XCircle className="h-3 w-3 text-red-400" />}
                      {d.status === 'QUEUED' && <Clock className="h-3 w-3 text-amber-400" />}
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    <span className="truncate max-w-xs block" title={d.destinationUrl}>{d.destinationUrl}</span>
                  </td>
                  <td className="px-4 py-3">
                    {d.responseMetadata?.statusCode ? (
                      <span className={`rounded px-1.5 py-0.5 font-bold ${
                        d.responseMetadata.statusCode >= 200 && d.responseMetadata.statusCode < 300 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                      }`}>
                        HTTP {d.responseMetadata.statusCode}
                      </span>
                    ) : d.responseMetadata?.error ? (
                      <span className="text-[10px] text-red-400" title={d.responseMetadata.error}>
                        {d.responseMetadata.error.slice(0, 30)}...
                      </span>
                    ) : (
                      <span className="text-slate-600">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {new Date(d.createdAt).toLocaleString()}
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
