'use client';

import React, { useState, useEffect } from 'react';
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
  Brain,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';

export default function AlertsLedger() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  // AI Assistant Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [severity, status]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      let queryParams = `?search=${search}`;
      if (severity) queryParams += `&severity=${severity}`;
      if (status) queryParams += `&status=${status}`;

      const res = await fetch(`${apiUrl}/alerts${queryParams}`, {
        headers: { 'x-organization-id': orgId }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (alert: any) => {
    setSelectedAlert(alert);
    setAiAnalysis(null); // Clear previous analysis
  };

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await res.json();
      
      // Update local state
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
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/alerts/${alertId}/create-incident`, {
        method: 'POST',
        headers: {
          'x-organization-id': orgId
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Alert escalated successfully! Incident created.');
        fetchAlerts();
        setSelectedAlert(null);
      } else {
        throw new Error(data.error?.message || 'Escalation failed');
      }
    } catch (err: any) {
      alert(`Escalation failed: ${err.message}`);
    }
  };

  const requestAIPlaybook = async (alert: any) => {
    setAiLoading(true);
    setAiAnalysis(null);
    
    // Simulate AI request matching our mock engine fallback
    setTimeout(() => {
      setAiAnalysis(
        `### AI Advisory Playbook: ${alert.title}\n\n` +
        `**Mitigation Steps:**\n` +
        `1. **Network Containment:** Block source address \`${alert.ipAddress || 'Host Local'}\` at Web Gateway firewalls.\n` +
        `2. **Credentials Revocation:** Terminate all active sessions for targeted domain accounts inside Okta/ActiveDirectory.\n` +
        `3. **Forensic Collection:** Extract host security logs (evt-4624 audit tokens) from affected node.\n\n` +
        `*AI-generated analysis. Analyst verification required before code execution.*`
      );
      setAiLoading(false);
    }, 1200);
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
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'INVESTIGATING')}
                  className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold py-1.5 rounded text-[11px] transition-colors"
                >
                  Investigate
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')}
                  className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-700 text-emerald-400 font-semibold py-1.5 rounded text-[11px] transition-colors"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleEscalate(selectedAlert.id)}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 rounded text-[11px] transition-colors flex items-center justify-center gap-0.5 shadow-md shadow-cyan-500/10"
                >
                  Escalate <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* AI Investigation Section */}
            <div className="space-y-3 border-t border-slate-900 pt-5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Diagnostics Copilot</span>
                <button
                  onClick={() => requestAIPlaybook(selectedAlert)}
                  disabled={aiLoading}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <Brain className="h-3 w-3" /> {aiLoading ? 'Analyzing...' : 'Generate Playbook'}
                </button>
              </div>

              {aiAnalysis ? (
                <div className="p-4 bg-cyan-950/10 border border-cyan-800/10 rounded font-mono text-[10px] text-slate-300 space-y-2 whitespace-pre-line leading-relaxed">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/30 rounded border border-slate-900 text-center py-6 text-xs text-slate-500">
                  Click 'Generate Playbook' to compile forensic advice.
                </div>
              )}
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
