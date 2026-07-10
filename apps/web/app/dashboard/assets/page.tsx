'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Search, Server, Monitor, ShieldAlert, AlertCircle, Database, Network } from 'lucide-react';

export default function AssetsRegistry() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchAssets();
  }, [typeFilter]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      let queryParams = `?search=${search}`;
      if (typeFilter) queryParams += `&type=${typeFilter}`;

      const res = await fetch(`${apiUrl}/assets${queryParams}`, {
        headers: { 'x-organization-id': orgId }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAssets(data);
      }
    } catch (err) {
      console.error(err);
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
            <Layers className="text-cyan-400" /> Asset Inventory Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete database of registered workstation endpoints, server nodes, network gates, database clusters, and cloud storage buckets.
          </p>
        </div>
      </div>

      {/* Filters Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-[#0b0f19] border border-slate-900">
        <div className="relative col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search hostname, IP address, display name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-slate-800 bg-slate-950/60 text-xs text-white px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Asset Types</option>
          <option value="SERVER">Server</option>
          <option value="DATABASE">Database</option>
          <option value="WORKSTATION">Workstation</option>
          <option value="NETWORK_DEVICE">Network Device</option>
        </select>

        <button
          onClick={fetchAssets}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded transition-colors"
        >
          Query Assets
        </button>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono">
          <Layers className="h-6 w-6 animate-spin mx-auto text-cyan-400 mb-2" /> Querying inventory databases...
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-mono">
          No registered assets match selection rules.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const isServer = asset.type === 'SERVER' || asset.type === 'DATABASE';
            return (
              <div key={asset.id} className="premium-card p-5 rounded-lg border border-slate-900 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-slate-950 border border-slate-900 flex items-center justify-center text-cyan-400">
                      {isServer ? <Server className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white truncate max-w-[120px]">{asset.displayName}</h4>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{asset.hostname}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                    asset.businessCriticality === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {asset.businessCriticality}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded bg-slate-950/40 text-[10px] font-mono text-slate-400 border border-slate-900">
                  <div>IP: <span className="text-white">{asset.ipAddress}</span></div>
                  <div>Type: <span className="text-white">{asset.type}</span></div>
                  <div>Risk: <span className="text-cyan-400 font-bold">{asset.riskScore.toFixed(0)}</span></div>
                  <div>Env: <span className="text-white">{asset.environment}</span></div>
                </div>

                {/* Badges indicators alerts */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                    <span>{asset.activeAlertCount || 0} Alerts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5 text-amber-400" />
                    <span>{asset.vulnerabilityCount || 0} CVEs</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
