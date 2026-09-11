'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, ShieldCheck, BellRing, Database, RefreshCw } from 'lucide-react';
import { apiRequest, getActiveMembership } from '@/lib/api-client';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [form, setForm] = useState({
    size: '',
    industry: '',
    country: '',
    timeZone: '',
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    setLoading(true);

    try {
      const membership = getActiveMembership();
      if (!membership) {
        setOrganization(null);
        return;
      }

      setOrganization(membership);
      const data = await apiRequest<any>('/organizations/current');
      setForm({
        size: data?.size || '',
        industry: data?.industry || '',
        country: data?.country || '',
        timeZone: data?.timeZone || '',
      });
    } catch (err) {
      console.error(err);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiRequest('/organizations/current', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });

      await fetchOrganization();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="text-cyan-400" /> Organization Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure the current tenant profile, regional settings, and compliance metadata.
          </p>
        </div>

        <button
          onClick={fetchOrganization}
          className="text-xs font-semibold p-1.5 rounded border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono">
          <Settings className="h-6 w-6 animate-spin mx-auto text-cyan-400 mb-2" /> Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-card rounded-lg border border-slate-900 p-5 space-y-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Profile</div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs text-slate-300">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">Organization size</span>
                <input
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  placeholder="e.g. 100-500 employees"
                />
              </label>

              <label className="space-y-2 text-xs text-slate-300">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">Industry</span>
                <input
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  placeholder="e.g. Financial Services"
                />
              </label>

              <label className="space-y-2 text-xs text-slate-300">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">Country</span>
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  placeholder="e.g. United States"
                />
              </label>

              <label className="space-y-2 text-xs text-slate-300">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">Time zone</span>
                <input
                  value={form.timeZone}
                  onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  placeholder="e.g. UTC"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded bg-cyan-500 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="premium-card rounded-lg border border-slate-900 p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">Tenant summary</div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-2">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Security posture</span>
                  <span className="text-emerald-400 font-semibold">Enabled</span>
                </div>
                <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-2">
                  <span className="flex items-center gap-2"><BellRing className="h-4 w-4 text-cyan-400" /> Alert routing</span>
                  <span className="text-white font-semibold">Live</span>
                </div>
                <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-2">
                  <span className="flex items-center gap-2"><Database className="h-4 w-4 text-violet-400" /> Data retention</span>
                  <span className="text-white font-semibold">365 days</span>
                </div>
              </div>
            </div>

            <div className="premium-card rounded-lg border border-slate-900 p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">Active tenant</div>
              <div className="text-lg font-bold text-white">{organization?.organizationName || 'Unknown tenant'}</div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
