'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Webhook,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Key,
  Play,
  AlertCircle,
  Activity,
  Zap,
  Clock,
  ShieldCheck,
  Lock,
  FileCode,
} from 'lucide-react';
import {
  getIntegrationDetails,
  getIntegrationMetrics,
  updateIntegration,
  regenerateIntegrationSecret,
  revokeIntegrationSecret,
  testIntegrationEvent,
  deleteIntegration,
  API_BASE_URL,
} from '@/lib/api-client';

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [integration, setIntegration] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Field mapping state
  const [fieldMapJson, setFieldMapJson] = useState('{}');
  const [savingConfig, setSavingConfig] = useState(false);

  // Test event state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Modal / Copy state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [activeSecret, setActiveSecret] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, metricData] = await Promise.all([
        getIntegrationDetails(id),
        getIntegrationMetrics(id).catch(() => null),
      ]);
      setIntegration(detail);
      setMetrics(metricData);
      setFieldMapJson(
        JSON.stringify(detail?.configuration?.fieldMap || {}, null, 2),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleSaveFieldMap = async () => {
    setSavingConfig(true);
    setError(null);
    setNotice(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(fieldMapJson);
      } catch {
        throw new Error('Invalid JSON syntax in Field Mapping editor.');
      }

      const updated = await updateIntegration(id, {
        configuration: {
          fieldMap: parsed,
        },
      });
      setIntegration(updated);
      setNotice('Field mapping successfully updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestEvent = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await testIntegrationEvent(id);
      setTestResult(result);
      setNotice(`Test event executed: ${result.eventsProcessed} event(s) processed.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test event execution failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleRegenerateSecret = async () => {
    setError(null);
    setNotice(null);
    try {
      const res = await regenerateIntegrationSecret(id);
      setIntegration(res);
      setActiveSecret(res.secretToken || null);
      setNotice('Webhook secret token regenerated. Make sure to copy it now.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate secret.');
    }
  };

  const handleRevokeSecret = async () => {
    if (!confirm('Are you sure you want to revoke this secret token? Incoming telemetry will be rejected.')) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await revokeIntegrationSecret(id);
      setIntegration(res);
      setActiveSecret(null);
      setNotice('Integration secret token revoked. Status set to DISCONNECTED.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke secret.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this integration endpoint?')) {
      return;
    }
    try {
      await deleteIntegration(id);
      router.push('/dashboard/integrations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration.');
    }
  };

  const webhookUrl = `${API_BASE_URL}/events/webhook/${id}`;
  const displaySecret = activeSecret || integration?.encryptedCredentials || 'whsec_xxxxxxxx';

  const curlSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: ${displaySecret}" \\
  -d '{
    "event_name": "UNAUTHORIZED_ACCESS_ATTEMPT",
    "host": "prod-auth-node-02",
    "client_ip": "198.51.100.77",
    "details": "Failed SSH login threshold exceeded"
  }'`;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs text-slate-500">
        Loading integration details...
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="text-red-400">Integration not found.</p>
        <Link href="/dashboard/integrations" className="mt-4 inline-block text-xs text-cyan-400 hover:underline">
          &larr; Back to Integrations
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header Navigation */}
      <div>
        <Link
          href="/dashboard/integrations"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Integrations Console
        </Link>
      </div>

      {/* Main Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-400">
            {integration.type === 'AWS_CLOUDTRAIL' ? <Cloud className="h-6 w-6" /> : <Webhook className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{integration.name}</h1>
              <span className="rounded bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-cyan-400">
                {integration.type}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                  integration.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {integration.status}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">Endpoint ID: {integration.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestEvent}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {testing ? 'Testing...' : 'Send Test Event'}
          </button>

          <button
            type="button"
            onClick={handleRegenerateSecret}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <Key className="h-3.5 w-3.5" /> Rotate Secret
          </button>

          <button
            type="button"
            onClick={handleRevokeSecret}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            <Lock className="h-3.5 w-3.5" /> Revoke Token
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-950 bg-red-950/20 p-2 text-red-400 hover:border-red-800 hover:bg-red-950/50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Ingested Events</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {metrics?.totalEvents ?? integration.eventCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">All-time normalized security events</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">24h Ingestion Volume</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {metrics?.eventsLast24h ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Last hour: {metrics?.eventsLastHour ?? 0} events</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Triggered Alerts</span>
            <ShieldCheck className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {metrics?.alertsGenerated ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Detection rules matched downstream</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingestion Health</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-base font-bold font-mono text-emerald-400">
            {integration.health || 'OK'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Errors: {integration.errorCount ?? 0}
          </div>
        </div>
      </div>

      {/* Main Details & Config Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Endpoint & cURL Snippet */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Ingestion Endpoint & Authentication</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Webhook Target URL
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-400"
              />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(webhookUrl);
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sample Integration cURL Command
            </label>
            <pre className="mt-1.5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
              {curlSnippet}
            </pre>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(curlSnippet);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2000);
              }}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-cyan-400 hover:underline"
            >
              {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedCurl ? 'Copied cURL command!' : 'Copy cURL Command'}
            </button>
          </div>
        </div>

        {/* Field Mapping Editor */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Payload Field Normalization Mapping</h2>
            <button
              type="button"
              onClick={handleSaveFieldMap}
              disabled={savingConfig}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {savingConfig ? 'Saving...' : 'Save Mapping'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Configure custom dot-notation mapping rules to transform vendor JSON fields into canonical SecurityEvent fields.
          </p>

          <textarea
            rows={10}
            value={fieldMapJson}
            onChange={(e) => setFieldMapJson(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-cyan-400 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Test Execution Result Box */}
      {testResult && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-cyan-400">Last Test Event Execution Result</h3>
          <div className="grid gap-4 sm:grid-cols-3 font-mono text-xs">
            <div>
              <span className="text-slate-400">Events Processed:</span>{' '}
              <span className="font-bold text-white">{testResult.eventsProcessed}</span>
            </div>
            <div>
              <span className="text-slate-400">Alerts Created:</span>{' '}
              <span className="font-bold text-amber-400">{testResult.alertsCreated?.length ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>{' '}
              <span className="font-bold text-emerald-400">SUCCESS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
