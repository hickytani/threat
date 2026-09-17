'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Plus, RefreshCw, Trash2, ShieldAlert, CheckCircle, AlertTriangle, Key, ExternalLink } from 'lucide-react';
import { getNotificationPolicies, createNotificationPolicy, updateNotificationPolicy, deleteNotificationPolicy } from '@/lib/api-client';

export default function NotificationPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minSeverity, setMinSeverity] = useState('HIGH');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotificationPolicies();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !webhookUrl.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createNotificationPolicy({
        name,
        description,
        minSeverity,
        channelType: 'WEBHOOK',
        webhookUrl,
        secretToken: secretToken || undefined,
      });

      setShowModal(false);
      setName('');
      setDescription('');
      setWebhookUrl('');
      setSecretToken('');
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notification policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (policy: any) => {
    try {
      await updateNotificationPolicy(policy.id, { isEnabled: !policy.isEnabled });
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificationPolicy(id);
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy.');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400">NOTIFICATION ENGINE</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Notification Policies & Webhook Rules</h1>
          <p className="mt-1 text-sm text-slate-400">
            Define automated event-driven notification dispatch rules for critical security alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadPolicies}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Create Policy
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Policies Grid */}
      {loading ? (
        <div className="py-12 text-center font-mono text-xs text-slate-500">Loading notification policies...</div>
      ) : policies.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">No notification policies configured</p>
          <p className="mt-1 text-xs text-slate-500">Create a policy to route high-severity alerts to external webhooks or Slack endpoints.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-950/20"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${getSeverityBadge(policy.minSeverity)}`}>
                      Min Severity: {policy.minSeverity}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-white">{policy.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(policy)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-medium transition-colors ${
                      policy.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {policy.isEnabled ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{policy.description}</p>

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="truncate text-cyan-400">{policy.webhookUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] font-mono text-slate-500">
                <div>Channel: {policy.channelType}</div>
                <button
                  type="button"
                  onClick={() => handleDelete(policy.id)}
                  className="inline-flex items-center gap-1 rounded border border-red-950 px-2 py-1 text-red-400 hover:border-red-800 hover:bg-red-950/40"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create Notification Policy</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Incident Pager Webhook"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explains when and where this notification fires..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Minimum Alert Severity</label>
                <select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="CRITICAL">Critical Only</option>
                  <option value="HIGH">High and Above</option>
                  <option value="MEDIUM">Medium and Above</option>
                  <option value="LOW">Low and Above</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Destination Webhook URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/webhooks/security"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-400 focus:border-cyan-500 focus:outline-none"
                />
                <p className="mt-1 font-mono text-[10px] text-slate-500">SSRF Guard enforces public HTTP/HTTPS endpoints only.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Secret Signature Token (Optional)</label>
                <input
                  type="password"
                  placeholder="Optional secret token sent in X-Notification-Secret"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
