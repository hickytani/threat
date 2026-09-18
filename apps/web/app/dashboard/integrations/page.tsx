'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Webhook, Shield, Cloud, Server, Plus, RefreshCw, Copy, Check, Trash2, Key, AlertCircle, ExternalLink } from 'lucide-react';
import { getIntegrations, createIntegration, regenerateIntegrationSecret, deleteIntegration, API_BASE_URL } from '@/lib/api-client';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Setup Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('WEBHOOK');
  const [name, setName] = useState('');
  const [fieldMapJson, setFieldMapJson] = useState('{\n  "eventType": "event_name",\n  "hostname": "host",\n  "sourceIp": "client_ip",\n  "message": "details"\n}');
  const [submitting, setSubmitting] = useState(false);

  // Webhook details modal
  const [activeWebhook, setActiveWebhook] = useState<any | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIntegrations();
      setIntegrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      let fieldMap = {};
      try {
        fieldMap = JSON.parse(fieldMapJson);
      } catch {
        throw new Error('Invalid JSON format for Field Mapping.');
      }

      const created = await createIntegration({
        name,
        type: selectedType,
        configuration: { fieldMap },
      });

      setShowModal(false);
      setName('');
      setActiveWebhook(created);
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create integration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    try {
      const updated = await regenerateIntegrationSecret(id);
      setActiveWebhook(updated);
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate webhook secret.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    try {
      await deleteIntegration(id);
      if (activeWebhook?.id === id) setActiveWebhook(null);
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration.');
    }
  };

  const getWebhookUrl = (id: string) => `${API_BASE_URL}/events/webhook/${id}`;

  const getCurlSnippet = (wh: any) => {
    const url = getWebhookUrl(wh.id);
    const secret = wh.secretToken || wh.encryptedCredentials || wh.configuration?.webhookSecret || 'YOUR_SECRET';
    return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: ${secret}" \\
  -d '{
    "event_name": "UNAUTHORIZED_S3_ACCESS",
    "host": "aws-prod-s3-01",
    "client_ip": "198.51.100.44",
    "details": "Bucket policy manual override detected"
  }'`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400">INTEGRATION FRAMEWORK</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Telemetry Integrations & Ingestion Console</h1>
          <p className="mt-1 text-sm text-slate-400">
            Connect external telemetry sources, AWS CloudTrail, or generic JSON webhooks to ThreatSync's canonical detection pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadIntegrations}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedType('WEBHOOK');
              setName('Generic Webhook Receiver');
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Connect Integration
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Catalog Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => {
            setSelectedType('WEBHOOK');
            setName('Generic Webhook Endpoint');
            setShowModal(true);
          }}
          className="cursor-pointer rounded-xl border border-cyan-500/30 bg-slate-900/80 p-5 transition-all hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/30"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <Webhook className="h-5 w-5" />
            </div>
            <span className="font-mono text-[10px] font-semibold text-emerald-400">READY</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">Generic Webhook</h3>
          <p className="mt-1 text-xs text-slate-400">Ingest arbitrary JSON payloads with custom field normalization.</p>
        </div>

        <div
          onClick={() => {
            setSelectedType('AWS_CLOUDTRAIL');
            setName('AWS CloudTrail Stream');
            setShowModal(true);
          }}
          className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Cloud className="h-5 w-5" />
            </div>
            <span className="font-mono text-[10px] font-semibold text-cyan-400">READY</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">AWS CloudTrail</h3>
          <p className="mt-1 text-xs text-slate-400">Parse CloudTrail event envelopes delivered through SNS, EventBridge, or HTTP webhooks.</p>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5 opacity-60">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-mono text-[10px] font-semibold text-slate-500">SOON</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-300">Microsoft Defender</h3>
          <p className="mt-1 text-xs text-slate-500">Native graph security alerts connector.</p>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5 opacity-60">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
              <Server className="h-5 w-5" />
            </div>
            <span className="font-mono text-[10px] font-semibold text-slate-500">SOON</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-300">Splunk HTTP Event Collector</h3>
          <p className="mt-1 text-xs text-slate-500">Direct HEC forwarder receiver integration.</p>
        </div>
      </div>

      {/* Configured Integrations List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-base font-semibold text-white">Active Integration Endpoints</h2>
        <p className="mt-1 text-xs text-slate-400">Configured tenant integration credentials and webhook endpoints.</p>

        {loading ? (
          <div className="py-8 text-center font-mono text-xs text-slate-500">Loading active endpoints...</div>
        ) : integrations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No active integrations configured yet. Click above to create one.</div>
        ) : (
          <div className="mt-4 divide-y divide-slate-800/80">
            {integrations.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{item.name}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-400">{item.type}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                      item.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {item.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    Events: {item.eventCount ?? 0} | Errors: {item.errorCount ?? 0} | Last Ingest: {item.lastReceivedAt ? new Date(item.lastReceivedAt).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/integrations/${item.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-500 hover:text-white"
                  >
                    Console <ExternalLink className="h-3 w-3" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setActiveWebhook(item)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-500 hover:text-white"
                  >
                    Quick cURL
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-red-950 p-1.5 text-red-400 hover:border-red-800 hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Setup Telemetry Integration</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Integration Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Datadog Production Webhook"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Integration Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="WEBHOOK">Generic Webhook Receiver</option>
                  <option value="AWS_CLOUDTRAIL">AWS CloudTrail Receiver</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Payload Field Mapping (JSON)</label>
                <textarea
                  rows={5}
                  value={fieldMapJson}
                  onChange={(e) => setFieldMapJson(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-cyan-400 focus:border-cyan-500 focus:outline-none"
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
                  {submitting ? 'Connecting...' : 'Generate Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhook Details & Curl Modal */}
      {activeWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{activeWebhook.name}</h2>
              <button
                type="button"
                onClick={() => handleRegenerateSecret(activeWebhook.id)}
                className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20"
              >
                <Key className="h-3 w-3" /> Regenerate Secret
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Webhook Endpoint URL</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getWebhookUrl(activeWebhook.id)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-400"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(getWebhookUrl(activeWebhook.id));
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white"
                >
                  {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">cURL Integration Command</label>
              <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
                {getCurlSnippet(activeWebhook)}
              </pre>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(getCurlSnippet(activeWebhook));
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-cyan-400 hover:underline"
              >
                {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCurl ? 'Copied cURL snippet!' : 'Copy cURL Snippet'}
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href={`/dashboard/integrations/${activeWebhook.id}`}
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
              >
                Open Full Integration Console &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setActiveWebhook(null)}
                className="rounded-lg border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
