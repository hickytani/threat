'use client';

import React, { useState, useEffect } from 'react';
import { Database, Search, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

export default function VulnerabilityManager() {
  const [loading, setLoading] = useState(true);
  const [vulns, setVulns] = useState<any[]>([]);

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

  const fetchVulnerabilities = async () => {
    setLoading(true);
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/asset-vulnerabilities`, {
        headers: { 'x-organization-id': orgId }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVulns(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemediate = async (id: string) => {
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/asset-vulnerabilities/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ status: 'REMEDIATED' })
      });
      if (res.ok) {
        alert('Vulnerability status updated to Remediated.');
        fetchVulnerabilities();
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
            <Database className="text-cyan-400" /> Vulnerability & Exposure tracking
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track unpatched CVE listings resolved on network endpoints, and document audit patches.
          </p>
        </div>
        <button
          onClick={fetchVulnerabilities}
          className="text-xs font-semibold p-1.5 rounded border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Grid Ledger */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono">Loading vulnerability map...</div>
      ) : vulns.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-mono">No vulnerabilities logged.</div>
      ) : (
        <div className="space-y-4">
          {vulns.map((v) => (
            <div key={v.id} className="premium-card p-5 rounded-lg border border-slate-900 flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-white font-mono">{v.cveId}</span>
                  <span className={`px-2 py-0.5 rounded-[3px] text-[8px] font-bold ${
                    v.vulnerability?.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    CVSS {v.vulnerability?.cvssScore || 9.8} • {v.vulnerability?.severity}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[150px]">Asset: {v.asset?.displayName || 'Host Node'}</span>
                </div>
                <h4 className="font-bold text-xs text-slate-200 leading-snug">{v.vulnerability?.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{v.vulnerability?.description}</p>
                <div className="text-[10px] text-cyan-400 font-mono">Remediation: {v.vulnerability?.remediation}</div>
              </div>

              <div className="flex flex-col justify-between items-end gap-2 border-l border-slate-900 pl-4 md:w-48">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  v.status === 'REMEDIATED' ? 'text-emerald-400 border border-emerald-500/20 bg-emerald-950/20' : 'text-rose-400 border border-rose-500/20 bg-rose-950/20 animate-pulse'
                }`}>
                  {v.status}
                </span>

                {v.status === 'OPEN' && (
                  <button
                    onClick={() => handleRemediate(v.id)}
                    className="text-[10px] bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-400 text-white font-bold py-1 px-3 rounded transition-colors"
                  >
                    Confirm Patch
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
