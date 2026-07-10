'use client';

import React, { useState } from 'react';
import { Search, Terminal, Activity, FileText } from 'lucide-react';

export default function EventExplorer() {
  const [query, setQuery] = useState('severity:high AND source:okta');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate query parsing and filtering on mock SIEM logs
    setTimeout(() => {
      setLogs([
        {
          timestamp: new Date().toISOString(),
          source: 'OktaIDP',
          type: 'OKTA_AUTH_AUDIT',
          message: 'Anomalous password challenge failure for admin account',
          outcome: 'FAILURE',
          ip: '198.51.100.99'
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          source: 'OktaIDP',
          type: 'OKTA_AUTH_AUDIT',
          message: 'Failed login password challenge for administrator',
          outcome: 'FAILURE',
          ip: '198.51.100.99'
        }
      ]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Terminal className="text-cyan-400" /> SIEM Event Explorer
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perform query searches across raw aggregated telemetry security logs. Supports text filters and source parameters.
        </p>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 p-4 rounded-lg bg-[#0b0f19] border border-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. severity:critical AND source:firewall"
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>
        <button
          type="submit"
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-6 py-1.5 rounded transition-colors"
        >
          Execute Search
        </button>
      </form>

      {/* Event Logs List */}
      <div className="space-y-3">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Search Results</div>
        
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <Activity className="h-4 w-4 animate-spin mx-auto text-cyan-400 mb-1" /> Executing SIEM log query...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 rounded border border-slate-900 text-center text-xs text-slate-500 bg-slate-950/20 font-mono">
            Execute a query to retrieve matched security logs.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, idx) => (
              <div key={idx} className="p-4 bg-slate-950/60 border border-slate-900 rounded font-mono text-[11px] space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span className="font-bold text-slate-400">{log.type} ({log.source})</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-white font-medium">{log.message}</div>
                <div className="text-[10px] text-slate-500">
                  IP Source: <span className="text-cyan-400 font-semibold">{log.ip}</span> • Outcome: <span className="text-red-400">{log.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
