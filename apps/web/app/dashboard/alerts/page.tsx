'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { 
  AlertTriangle, 
  Search, 
  UserPlus, 
  ArrowUpRight, 
  X, 
  Cpu, 
  FileCode, 
  Play, 
  Activity,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { apiRequest, getActiveMembership } from '@/lib/api-client';

export default function AlertsLedger() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, [severity, status]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const membership = getActiveMembership();
      if (!membership) {
        setAlerts([]);
        return;
      }

      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (severity) query.set('severity', severity);
      if (status) query.set('status', status);

      const data = await apiRequest<any[]>(`/alerts${query.size ? `?${query.toString()}` : ''}`);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching alerts', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (alert: any) => {
    setSelectedAlert(alert);
  };

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    try {
      const updated = await apiRequest<any>(`/alerts/${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      setAlerts(alerts.map(a => a.id === alertId ? { ...a, status: updated.status } : a));
      if (selectedAlert?.id === alertId) {
        setSelectedAlert({ ...selectedAlert, status: updated.status });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalate = async (alertId: string) => {
    try {
      await apiRequest<any>(`/alerts/${alertId}/create-incident`, { method: 'POST' });
      alert('Alert escalated successfully! Incident created.');
      fetchAlerts();
      setSelectedAlert(null);
    } catch (err: any) {
      alert(`Escalation failed: ${err.message}`);
    }
  };

  return (
    <div className="flex h-full w-full relative">
      
      {/* Ledger Workspace */}
      <div className="flex-1 p-6 space-y-6 overflow-x-auto min-w-0">
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="text-cyan-400" /> Security Alerts Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Audit log ledger of raw detections triggered by network sensors, cloud logging feeds, and endpoint agents.
            </p>
          </div>
        </div>

        {/* Filters Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-[#0b0f19] border border-slate-900">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search alert title, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAlerts()}
              className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950/60 text-xs text-white px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950/60 text-xs text-white px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-4 py-1.5 rounded transition-all shadow-md shadow-cyan-500/10"
          >
            Query Ledger
          </button>
        </div>

        {/* Alerts Table */}
        <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Alert Details</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-mono">
                    <Activity className="h-5 w-5 animate-spin mx-auto text-cyan-400 mb-2" /> Querying alerts ledger...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-mono">No telemetry alerts match current search query.</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr 
                    key={alert.id}
                    onClick={() => handleRowClick(alert)}
                    className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded-[3px] text-[9px] font-bold ${
                        alert.severity === 'CRITICAL' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                        alert.severity === 'HIGH' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                        alert.severity === 'MEDIUM' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate" title={alert.title}>
                      {alert.title}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{alert.category}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{alert.ipAddress || 'Localhost'}</td>
                    <td className="px-4 py-3 text-slate-400">{alert.source}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        alert.status === 'NEW' ? 'text-violet-400 border border-violet-500/20 bg-violet-950/20' :
                        alert.status === 'INVESTIGATING' ? 'text-cyan-400 border border-cyan-500/20 bg-cyan-950/20' :
                        alert.status === 'RESOLVED' ? 'text-emerald-400 border border-emerald-500/20 bg-emerald-950/20' :
                        'text-slate-400'
                      }`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-right">{new Date(alert.timestamp).toLocaleDateString()} {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Slide-Open Right Context Drawer */}
      {selectedAlert && (
        <aside className="w-[450px] bg-[#0b0f19] border-l border-slate-900 h-full flex flex-col justify-between overflow-y-auto flex-shrink-0 z-40 relative">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-900 bg-slate-950/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-cyan-400" />
              <span className="font-bold text-xs text-white">ALERT COMPASS CONTEXT</span>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedAlert(null)}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-5 space-y-6 flex-1">
            
            {/* Title Summary */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-[9px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">{selectedAlert.source}</span>
                <span className="text-[9px] font-mono bg-cyan-950/20 px-2 py-0.5 rounded text-cyan-400 border border-cyan-800/20">{selectedAlert.category}</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-tight">{selectedAlert.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{selectedAlert.description}</p>
            </div>

            {/* Ingestion & SLA */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950/40 border border-slate-900 text-xs">
              <div>
                <span className="text-[9px] text-slate-500 font-bold block">CONFIDENCE</span>
                <span className="font-bold text-white block mt-0.5">{selectedAlert.confidenceScore || 75}%</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold block">AFFECTED IP</span>
                <span className="font-mono text-cyan-400 block mt-0.5">{selectedAlert.ipAddress || '192.0.2.10'}</span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-3">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Triage Decisions</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/alerts/${selectedAlert.id}`}
                  className="flex-1 bg-cyan-950/40 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/60 font-semibold py-1.5 px-2 rounded text-[11px] text-center transition-colors flex items-center justify-center gap-1"
                >
                  Full Investigation Console <ArrowUpRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-700 text-emerald-400 font-semibold py-1.5 px-3 rounded text-[11px] transition-colors"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleEscalate(selectedAlert.id)}
                  className="bg-purple-950/40 border border-purple-800 text-purple-300 font-bold py-1.5 px-3 rounded text-[11px] transition-colors flex items-center justify-center gap-0.5"
                >
                  Escalate
                </button>
              </div>
            </div>


            {/* Real Detection Evidence Section */}
            <div className="space-y-3 border-t border-slate-900 pt-5">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5 text-cyan-400" /> Detection Reason & Rule Details
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded font-mono text-[10px] text-slate-300 space-y-2 leading-relaxed">
                <div>Rule ID: <span className="text-cyan-400 font-semibold">{selectedAlert.detectionRuleId || 'SYSTEM_RULE'}</span></div>
                <div>Category: <span className="text-white font-semibold">{selectedAlert.category}</span></div>
                <div>Source: <span className="text-white font-semibold">{selectedAlert.source}</span></div>
                <div>Confidence Score: <span className="text-emerald-400 font-bold">{selectedAlert.confidenceScore || 90}%</span></div>
              </div>
            </div>


            {/* Raw JSON Event Payload */}
            <div className="space-y-3 border-t border-slate-900 pt-5">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5" /> Matched Telemetry Payload (JSON)
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-900 rounded font-mono text-[9px] text-emerald-400 overflow-x-auto max-h-48">
                {JSON.stringify(selectedAlert.rawEvent || {}, null, 2)}
              </pre>
            </div>

          </div>

        </aside>
      )}

    </div>
  );
}
