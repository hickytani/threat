'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  createIngestionCredential,
  getIngestionCredentials,
  revokeIngestionCredential,
} from '@/lib/api-client';

interface IngestionCredential {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function IngestionPage() {
  const [credentials, setCredentials] = useState<IngestionCredential[]>([]);
  const [name, setName] = useState('Primary telemetry source');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIngestionCredentials();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ingestion credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNewToken(null);
    try {
      const credential = await createIngestionCredential(name);
      setNewToken(credential.token);
      setName('');
      await loadCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create ingestion credential.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      await revokeIngestionCredential(id);
      await loadCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to revoke ingestion credential.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400">TELEMETRY CONTROL</div>
          <h1 className="mt-3 text-2xl font-semibold text-white">Ingestion credentials</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Machine credentials are scoped to this organization and are separate from analyst login sessions.
          </p>
        </div>
        <button type="button" onClick={loadCredentials} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-500 hover:text-white" aria-label="Refresh credentials">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {newToken && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Credential created</div>
              <p className="mt-2 text-sm text-amber-100">Copy this token now. It will not be shown again.</p>
            </div>
            <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy token'}
            </button>
          </div>
          <code className="mt-4 block overflow-x-auto rounded-lg border border-amber-500/20 bg-slate-950/70 p-3 text-xs text-amber-100">{newToken}</code>
        </div>
      )}

      <form onSubmit={handleCreate} className="rounded-xl border border-slate-800 bg-[#091827]/80 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Plus className="h-4 w-4 text-cyan-400" />Create a credential</div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Credential name" className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 disabled:opacity-50">
            <KeyRound className="h-4 w-4" />{saving ? 'Creating...' : 'Create credential'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50">
        <div className="border-b border-slate-800 px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Active and revoked credentials</div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading credentials...</div>
        ) : credentials.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">No ingestion credentials have been created.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-white">{credential.name}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{credential.tokenPrefix}... {credential.lastUsedAt ? `| used ${new Date(credential.lastUsedAt).toLocaleString()}` : '| never used'}</div>
                </div>
                {credential.revokedAt ? (
                  <span className="text-xs font-semibold text-slate-500">Revoked {new Date(credential.revokedAt).toLocaleDateString()}</span>
                ) : (
                  <button type="button" onClick={() => handleRevoke(credential.id)} className="inline-flex items-center gap-2 self-start rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/30 md:self-auto">
                    <Trash2 className="h-3.5 w-3.5" />Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">HTTP ingestion endpoint</div>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-cyan-100">{`POST /api/v1/events/ingest
Authorization: Bearer <INGESTION_TOKEN>
Content-Type: application/json

{
  "eventType": "AUTHENTICATION_ANOMALY",
  "source": "your-agent",
  "severity": "HIGH",
  "message": "Failed login",
  "hostname": "workstation-01",
  "metadata": { "eventId": "evt-123", "sourceIp": "203.0.113.10" }
}`}</pre>
      </div>
    </div>
  );
}
