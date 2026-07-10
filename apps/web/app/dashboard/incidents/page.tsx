'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  Search, 
  Plus, 
  AlertCircle, 
  ArrowRight, 
  User, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  X
} from 'lucide-react';

export default function IncidentsList() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Create Incident Form States
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [incidentType, setIncidentType] = useState('AUTHENTICATION_ANOMALY');

  useEffect(() => {
    fetchIncidents();
  }, [status]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      let queryParams = `?search=${search}`;
      if (status) queryParams += `&status=${status}`;

      const res = await fetch(`${apiUrl}/incidents${queryParams}`, {
        headers: { 'x-organization-id': orgId }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setIncidents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({
          title,
          summary,
          severity,
          incidentType,
          priority: severity
        })
      });

      if (res.ok) {
        setShowModal(false);
        setTitle('');
        setSummary('');
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="text-cyan-400" /> Incident Command Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centralized registry for tracking escalated cybersecurity events, investigations, and playbook remediation checklists.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-4 py-2 rounded flex items-center gap-1.5 shadow-md shadow-cyan-500/10"
        >
          <Plus className="h-4 w-4" /> Log Incident
        </button>
      </div>

      {/* Filters Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-[#0b0f19] border border-slate-900">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search incident ticket ID, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchIncidents()}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-slate-800 bg-slate-950/60 text-xs text-white px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="REMEDIATION_IN_PROGRESS">Remediation</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <div />

        <button
          onClick={fetchIncidents}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500 text-white font-semibold text-xs px-4 py-1.5 rounded transition-all"
        >
          Query Incidents
        </button>
      </div>

      {/* Incidents Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">
          <Clock className="h-6 w-6 animate-spin mx-auto text-cyan-400 mb-2" /> Querying incident logs catalog...
        </div>
      ) : incidents.length === 0 ? (
        <div className="premium-card p-12 rounded-lg text-center space-y-4 max-w-md mx-auto border border-slate-900">
          <AlertCircle className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="font-bold text-white">No active incidents found</h3>
          <p className="text-xs text-slate-400">All alerts contained or organization hasn't escalated threat items yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {incidents.map((inc) => (
            <div key={inc.id} className="premium-card p-5 rounded-lg border border-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded-[3px] text-[8px] font-bold ${
                      inc.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {inc.severity}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 font-semibold uppercase">{inc.incidentType}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                    inc.status === 'RESOLVED' ? 'text-emerald-400 border border-emerald-500/20 bg-emerald-950/20' : 'text-cyan-400 border border-cyan-500/20 bg-cyan-950/20'
                  }`}>
                    {inc.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white leading-snug">{inc.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{inc.summary}</p>
              </div>

              <div className="flex justify-between items-center border-t border-slate-900 pt-3 text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{inc.assignedAnalystName || 'Unassigned'}</span>
                </div>
                <Link 
                  href={`/dashboard/incidents/${inc.id}`}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
                >
                  Enter Room <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#030712]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateIncident}
            className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <FolderOpen className="h-4.5 w-4.5 text-cyan-400" /> Log Security Incident
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Incident Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full mt-1 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
                  placeholder="e.g. Host compromise on DB server"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Scope Summary</label>
                <textarea
                  required
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="block w-full mt-1 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none resize-none"
                  placeholder="Detail scope of threat containment action..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="block w-full mt-1 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Threat Category</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="block w-full mt-1 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  >
                    <option value="AUTHENTICATION_ANOMALY">Auth Anomaly</option>
                    <option value="DATA_EXFILTRATION">Data Leak</option>
                    <option value="VULNERABILITY_EXPLOITATION">Vulnerability Exploit</option>
                    <option value="MALWARE_DETECTION">Malware Detection</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-4 py-2 rounded text-xs transition-colors shadow-md shadow-cyan-500/10"
              >
                Confirm Escalation
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
