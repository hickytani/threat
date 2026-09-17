'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, RefreshCw, Search, Play, Trash2, CheckCircle2, XCircle, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { getRules, createRule, updateRule, deleteRule, testRule } from '@/lib/api-client';

export default function DetectionRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Rule Form Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('CUSTOM_DETECTION');
  const [newRuleSeverity, setNewRuleSeverity] = useState('HIGH');
  const [newRuleField, setNewRuleField] = useState('eventType');
  const [newRuleOperator, setNewRuleOperator] = useState('EQUALS');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Test Modal State
  const [testingRule, setTestingRule] = useState<any | null>(null);
  const [sampleJson, setSampleJson] = useState('{\n  "eventType": "PROCESS_EXECUTION",\n  "metadata": {\n    "commandLine": "powershell.exe -enc aW52b2tl"\n  }\n}');
  const [testResult, setTestResult] = useState<any | null>(null);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRules({
        search: search || undefined,
        category: categoryFilter || undefined,
        severity: severityFilter || undefined,
      });
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detection rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [search, categoryFilter, severityFilter]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const matchConditions: Record<string, any> = {};
      if (newRuleField.startsWith('metadata.')) {
        const metaKey = newRuleField.replace('metadata.', '');
        matchConditions.metadata = {
          [metaKey]: { operator: newRuleOperator, value: newRuleValue },
        };
      } else {
        matchConditions[newRuleField] = { operator: newRuleOperator, value: newRuleValue };
      }

      await createRule({
        name: newRuleName,
        description: newRuleDesc,
        category: newRuleCategory,
        severity: newRuleSeverity,
        matchConditions,
      });

      setShowCreateModal(false);
      setNewRuleName('');
      setNewRuleDesc('');
      setNewRuleValue('');
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create detection rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRule = async (rule: any) => {
    try {
      await updateRule(rule.id, { isEnabled: !rule.isEnabled });
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule status.');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule(id);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule.');
    }
  };

  const handleRunTest = async () => {
    if (!testingRule) return;
    setError(null);
    try {
      const parsedSample = JSON.parse(sampleJson);
      const res = await testRule(testingRule.matchConditions || {}, parsedSample);
      setTestResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid sample event JSON format.');
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
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400">DETECTION ENGINE</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Detection Rule Catalog & Builder</h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure tenant-scoped detection rules evaluated in real time against incoming normalized telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadRules}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Create Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search detection rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="CUSTOM_DETECTION">Custom Detection</option>
            <option value="AUTHENTICATION_ANOMALY">Authentication Anomaly</option>
            <option value="ENDPOINT_ANOMALY">Endpoint Anomaly</option>
            <option value="THREAT_INTEL_MATCH">Threat Intel Match</option>
            <option value="POLICY_VIOLATION">Policy Violation</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Rules Grid / List */}
      {loading ? (
        <div className="py-12 text-center font-mono text-xs text-slate-500">Loading detection rules...</div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-12 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">No detection rules found</p>
          <p className="mt-1 text-xs text-slate-500">Create a custom rule to define deterministic security detections.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-950/20"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${getSeverityBadge(rule.severity)}`}>
                      {rule.severity}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-white">{rule.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-medium transition-colors ${
                      rule.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {rule.isEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{rule.description}</p>
                
                {/* Match Condition snippet */}
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[11px] text-slate-300">
                  <span className="text-slate-500">Condition: </span>
                  <code>{JSON.stringify(rule.matchConditions || {})}</code>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-500 font-mono">
                <div>Triggers: {rule.triggerCount || 0}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestingRule(rule);
                      setTestResult(null);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-cyan-500 hover:text-white"
                  >
                    <Play className="h-3 w-3" /> Test
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="inline-flex items-center gap-1 rounded border border-red-950 px-2 py-1 text-red-400 hover:border-red-800 hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create Custom Detection Rule</h2>
            <form onSubmit={handleCreateRule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suspicious PowerShell Encoded Execution"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explains what security threat this rule flags..."
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="CUSTOM_DETECTION">Custom Detection</option>
                    <option value="AUTHENTICATION_ANOMALY">Authentication Anomaly</option>
                    <option value="ENDPOINT_ANOMALY">Endpoint Anomaly</option>
                    <option value="THREAT_INTEL_MATCH">Threat Intel Match</option>
                    <option value="POLICY_VIOLATION">Policy Violation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Severity</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-3">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Match Condition Builder</div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newRuleField}
                    onChange={(e) => setNewRuleField(e.target.value)}
                    className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="eventType">eventType</option>
                    <option value="action">action</option>
                    <option value="outcome">outcome</option>
                    <option value="severity">severity</option>
                    <option value="metadata.commandLine">metadata.commandLine</option>
                    <option value="metadata.processName">metadata.processName</option>
                  </select>

                  <select
                    value={newRuleOperator}
                    onChange={(e) => setNewRuleOperator(e.target.value)}
                    className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="EQUALS">EQUALS</option>
                    <option value="CONTAINS">CONTAINS</option>
                    <option value="STARTS_WITH">STARTS_WITH</option>
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="Value to match"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Rule Modal */}
      {testingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Test Rule: {testingRule.name}</h2>
            <p className="mt-1 text-xs text-slate-400">Dry-run rule logic against sample event telemetry.</p>
            
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Sample Event Payload (JSON)</label>
                <textarea
                  rows={6}
                  value={sampleJson}
                  onChange={(e) => setSampleJson(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleRunTest}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
              >
                <Play className="h-3.5 w-3.5" /> Evaluate Rule
              </button>

              {testResult && (
                <div className={`rounded-lg border p-4 font-mono text-xs ${
                  testResult.matches ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-red-500/40 bg-red-500/10 text-red-400'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.matches ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{testResult.matches ? 'MATCH CONFIRMED' : 'NO MATCH'}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-300">
                    Evaluated fields: {JSON.stringify(testResult.evaluatedFields)}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setTestingRule(null)}
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
