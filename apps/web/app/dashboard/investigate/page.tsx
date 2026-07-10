'use client';

import React, { useState } from 'react';
import { BrainCircuit, Search, ShieldAlert, ShieldCheck, Activity, Globe, Cpu, Database, HeartPulse } from 'lucide-react';

export default function ForensicInvestigator() {
  const [value, setValue] = useState('');
  const [type, setType] = useState('IPV4');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/intelligence/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ value, type })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        throw new Error(data.error?.message || 'Investigation query failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection to intelligence provider failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <BrainCircuit className="text-cyan-400" /> Forensic Intelligence Workspace
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perform defensive on-demand enrichment checks on indicators of compromise (IOCs) including IP addresses, domains, file hashes, and vulnerability references.
        </p>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleInvestigate} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-[#0b0f19] border border-slate-900">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            required
            placeholder="e.g. 198.51.100.99, cobalt-strike-domain.com, d41d8cd98f00b2..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border border-slate-800 bg-slate-950/60 text-xs text-white px-3 py-1.5 focus:outline-none"
        >
          <option value="IPV4">IPv4 Address</option>
          <option value="DOMAIN">Domain Name</option>
          <option value="MD5">MD5 File Hash</option>
          <option value="SHA256">SHA-256 File Hash</option>
          <option value="CVE">CVE Identifier</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enriching...' : 'Investigate IOC'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-lg text-xs text-red-400 max-w-xl">
          {error}
        </div>
      )}

      {/* Forensic Report Display */}
      {result && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Card 1: Score & Metrics */}
          <div className="premium-card p-5 rounded-lg border border-slate-900 space-y-4">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider border-b border-slate-900 pb-2">Reputation Profile</h3>
            
            <div className="text-center py-6 space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Risk Score</span>
              <span className={`text-4xl font-bold font-mono block ${
                result.label === 'MALICIOUS' ? 'text-red-400' : result.label === 'SUSPICIOUS' ? 'text-orange-400' : 'text-slate-300'
              }`}>
                {result.reputationScore.toFixed(0)}/100
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono inline-block ${
                result.label === 'MALICIOUS' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              }`}>
                {result.label}
              </span>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-900 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Indicator type:</span>
                <span className="text-white font-mono">{result.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Country:</span>
                <span className="text-white font-semibold flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {result.country || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ASN:</span>
                <span className="text-white font-mono">{result.asn || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Enrichment Feeds */}
          <div className="premium-card p-5 rounded-lg border border-slate-900 md:col-span-2 space-y-4">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider border-b border-slate-900 pb-2 flex items-center gap-1">
              <HeartPulse className="h-4.5 w-4.5 text-cyan-400" /> Scanner Detections Breakdown
            </h3>

            <div className="space-y-4">
              {result.enrichments?.map((e: any) => (
                <div key={e.id} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>Source Feed: <span className="text-white font-bold">{e.sourceName}</span></span>
                    <span>Query Confidence: <span className="text-cyan-400 font-bold">{e.confidence}%</span></span>
                  </div>
                  
                  {/* Mock scans mapping */}
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded font-mono text-[10px] text-slate-400 space-y-1">
                    <div>AV Match 1 (Avast): <span className="text-rose-400">{e.rawResponse?.scans?.avast?.result || 'CLEAN'}</span></div>
                    <div>AV Match 2 (Sophos): <span className="text-rose-400">{e.rawResponse?.scans?.sophos?.result || 'CLEAN'}</span></div>
                  </div>
                </div>
              ))}
              
              <div className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                *Cache TTL checks complete. Intelligence results are transparent snapshots and do not alter active network rules.*
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
