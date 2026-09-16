'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Search, Server, Monitor, ShieldAlert, AlertCircle, Database, Network, Plus, X, Loader2 } from 'lucide-react';

import type { Asset } from 'shared-types';
import { apiRequest, getActiveMembership } from '@/lib/api-client';

export default function AssetsRegistry() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    hostname: '',
    displayName: '',
    ipAddress: '',
    type: 'SERVER',
    businessCriticality: 'MEDIUM',
    environment: 'PROD',
    isInternetFacing: false,
  });

  useEffect(() => {
    fetchAssets();
  }, [search, typeFilter]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const membership = getActiveMembership();
      if (!membership) {
        setAssets([]);
        return;
      }

      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (typeFilter) query.set('type', typeFilter);

      const data = await apiRequest<Asset[]>(`/assets${query.size ? `?${query.toString()}` : ''}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hostname.trim()) {
      setCreateError('Hostname is required.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await apiRequest('/assets', {
        method: 'POST',
        body: JSON.stringify({
          hostname: formData.hostname.trim(),
          displayName: formData.displayName.trim() || formData.hostname.trim(),
          ipAddress: formData.ipAddress.trim() || '0.0.0.0',
          type: formData.type,
          businessCriticality: formData.businessCriticality,
          environment: formData.environment,
          isInternetFacing: formData.isInternetFacing,
        }),
      });

      setIsModalOpen(false);
      setFormData({
        hostname: '',
        displayName: '',
        ipAddress: '',
        type: 'SERVER',
        businessCriticality: 'MEDIUM',
        environment: 'PROD',
        isInternetFacing: false,
      });
      await fetchAssets();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create asset');
    } finally {
      setCreating(false);
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
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-2 rounded flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-500/20"
        >
          <Plus className="h-4 w-4" /> Register Asset
        </button>
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
        <div className="text-center py-20 bg-slate-950/40 rounded-lg border border-slate-900/80 p-8 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
            <Layers className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">No registered assets found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Register your first endpoint or server node to begin tracking inventory posture and incoming security telemetry.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-2 rounded inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Register First Asset
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const isServer = asset.type === 'SERVER' || asset.type === 'DATABASE';
            return (
              <Link
                key={asset.id}
                href={`/dashboard/assets/${asset.id}`}
                className="premium-card p-5 rounded-lg border border-slate-900 space-y-4 hover:border-cyan-500/50 transition-colors block"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-slate-950 border border-slate-900 flex items-center justify-center text-cyan-400">
                      {isServer ? <Server className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white truncate max-w-[120px] hover:text-cyan-300">{asset.displayName}</h4>
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
              </Link>
            );
          })}
        </div>
      )}

      {/* Register Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="text-cyan-400 h-4 w-4" /> Register New Asset
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAsset} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Hostname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. srv-app-01.corp.internal"
                  value={formData.hostname}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Core Application Server"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">IP Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 10.0.1.25"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Asset Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SERVER">Server</option>
                    <option value="WORKSTATION">Workstation</option>
                    <option value="DATABASE">Database</option>
                    <option value="NETWORK_DEVICE">Network Device</option>
                    <option value="CLOUD_INSTANCE">Cloud Instance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Criticality</label>
                  <select
                    value={formData.businessCriticality}
                    onChange={(e) => setFormData({ ...formData, businessCriticality: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Environment</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DEV">Dev</option>
                    <option value="STAGING">Staging</option>
                    <option value="PROD">Production</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="internetFacing"
                  checked={formData.isInternetFacing}
                  onChange={(e) => setFormData({ ...formData, isInternetFacing: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="internetFacing" className="text-xs text-slate-300">
                  Internet Facing Asset
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
