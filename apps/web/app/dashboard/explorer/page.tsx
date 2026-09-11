'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { SecurityEvent } from 'shared-types';
import { searchEvents, getAssets, getAlerts, getIncidents } from '@/lib/api-client';
import { LoadingSpinner, ErrorView, SeverityBadge, EmptyState } from '@/components/StateViews';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Terminal,
  Activity,
  Search,
  RefreshCw,
  Server,
  Workflow,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileCode,
  ShieldAlert,
  Database,
  ExternalLink,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function EventExplorerPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'canvas'>('events');

  // Search & Pagination States
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number; totalPages: number }>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Filters
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [userIdentity, setUserIdentity] = useState('');
  const [selectedRawJson, setSelectedRawJson] = useState<SecurityEvent | null>(null);

  // ReactFlow Canvas States
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loadingCanvas, setLoadingCanvas] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchEvents = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchEvents({
        page,
        pageSize: 20,
        eventType,
        severity,
        source,
        ipAddress,
        userIdentity,
      });
      setEvents(res.data || []);
      setMeta(res.meta || { page, pageSize: 20, total: (res.data || []).length, totalPages: 1 });
    } catch (err: any) {
      console.error('Failed to search events:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventType, severity, source, ipAddress, userIdentity]);

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  const loadCanvasGraph = async () => {
    setLoadingCanvas(true);
    try {
      const [assetsData, alertsData, incidentsData] = await Promise.all([
        getAssets().catch(() => []),
        getAlerts().catch(() => []),
        getIncidents().catch(() => []),
      ]);

      const flowNodes: any[] = [];
      const flowEdges: any[] = [];

      let currentX = 100;
      incidentsData.slice(0, 4).forEach((inc, idx) => {
        flowNodes.push({
          id: inc.id,
          type: 'default',
          position: { x: 300 + idx * 260, y: 40 },
          data: {
            label: (
              <div className="flex flex-col text-left font-sans text-xs">
                <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 animate-pulse" /> INCIDENT
                </span>
                <span className="font-bold text-white mt-0.5 truncate max-w-[160px]">{inc.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">{inc.status}</span>
              </div>
            ),
            raw: inc,
            nodeType: 'incident',
          },
          style: {
            background: 'rgba(15, 8, 15, 0.95)',
            border: '1.5px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            width: 200,
          },
        });
      });

      currentX = 100;
      assetsData.forEach((ast) => {
        flowNodes.push({
          id: ast.id,
          type: 'default',
          position: { x: currentX, y: 420 },
          data: {
            label: (
              <div className="flex flex-col text-left font-sans text-xs">
                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Server className="h-3 w-3" /> {ast.type}
                </span>
                <span className="font-bold text-white mt-0.5 truncate max-w-[150px]">{ast.hostname}</span>
                <span className="text-[10px] text-slate-400 font-mono">{ast.ipAddress}</span>
              </div>
            ),
            raw: ast,
            nodeType: 'asset',
          },
          style: {
            background: 'rgba(10, 15, 28, 0.95)',
            border: '1.5px solid rgba(6, 182, 212, 0.5)',
            borderRadius: '8px',
            width: 180,
          },
        });
        currentX += 240;
      });

      currentX = 80;
      alertsData.slice(0, 6).forEach((alrt, idx) => {
        flowNodes.push({
          id: alrt.id,
          type: 'default',
          position: { x: currentX + (idx % 2 === 0 ? 20 : -20), y: 220 + (idx % 2) * 50 },
          data: {
            label: (
              <div className="flex flex-col text-left font-sans text-xs">
                <span className="text-[9px] text-orange-400 font-bold uppercase tracking-wider">ALERT</span>
                <span className="font-bold text-white mt-0.5 truncate max-w-[160px]">{alrt.title}</span>
                <span className="text-[9px] text-slate-400 font-mono">{alrt.severity}</span>
              </div>
            ),
            raw: alrt,
            nodeType: 'alert',
          },
          style: {
            background: 'rgba(20, 12, 8, 0.95)',
            border: '1.5px solid rgba(249, 115, 22, 0.5)',
            borderRadius: '8px',
            width: 190,
          },
        });

        if (alrt.assetId) {
          flowEdges.push({
            id: `edge-${alrt.id}-${alrt.assetId}`,
            source: alrt.id,
            target: alrt.assetId,
            animated: true,
            style: { stroke: '#f97316', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
          });
        }

        if (alrt.incidentId) {
          flowEdges.push({
            id: `edge-${alrt.id}-${alrt.incidentId}`,
            source: alrt.id,
            target: alrt.incidentId,
            style: { stroke: '#ef4444', strokeDasharray: '4,4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          });
        }

        currentX += 220;
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error('Failed to build flow graph:', err);
    } finally {
      setLoadingCanvas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'canvas') {
      loadCanvasGraph();
    }
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Mode Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Workflow className="h-5 w-5 text-cyan-400" /> Event Explorer & Threat propagation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Query backend security event logs with structured filtering, pagination envelopes, and asset correlation canvas.
          </p>
        </div>

        <div className="flex rounded border border-slate-800 bg-slate-950 p-1">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1 text-xs font-bold font-mono rounded transition-colors ${
              activeTab === 'events' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            SIEM Log Search
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1 text-xs font-bold font-mono rounded transition-colors ${
              activeTab === 'canvas' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Threat Propagation Canvas
          </button>
        </div>
      </div>

      {activeTab === 'events' ? (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <input
              type="text"
              placeholder="Event Type (e.g. PROCESS_EXECUTION)"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <input
              type="text"
              placeholder="IP Address (e.g. 192.168.1.1)"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            <input
              type="text"
              placeholder="User Identity"
              value={userIdentity}
              onChange={(e) => setUserIdentity(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            <button
              onClick={() => fetchEvents(1)}
              className="px-4 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" /> Apply Filters
            </button>
          </div>

          {/* Error View */}
          {error && <ErrorView error={error} onRetry={() => fetchEvents(1)} />}

          {/* Events Log Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Source IP</th>
                  <th className="px-4 py-3">Action / Outcome</th>
                  <th className="px-4 py-3 text-right">Evidence Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12"><LoadingSpinner label="Querying security log store..." /></td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8"><EmptyState title="No security events found" description="No event logs match the current search filters." /></td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-900/40 font-mono transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-cyan-400 font-bold">{evt.eventType}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={evt.severity} /></td>
                      <td className="px-4 py-3 text-slate-300">{evt.source}</td>
                      <td className="px-4 py-3 text-slate-300">{evt.sourceIp || 'Internal'}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {evt.action} / <span className={evt.outcome === 'FAILURE' || evt.outcome === 'BLOCKED' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{evt.outcome}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRawJson(selectedRawJson === evt ? null : evt)}
                          className="text-[10px] font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          <FileCode className="h-3 w-3" /> {selectedRawJson === evt ? 'Hide JSON' : 'Inspect JSON'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-900 bg-slate-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
              <div>
                Showing Page <strong className="text-white">{meta.page}</strong> of <strong className="text-white">{meta.totalPages}</strong> ({meta.total} Total Events)
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={meta.page <= 1 || loading}
                  onClick={() => fetchEvents(meta.page - 1)}
                  className="px-3 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={meta.page >= meta.totalPages || loading}
                  onClick={() => fetchEvents(meta.page + 1)}
                  className="px-3 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Raw JSON Inspection Drawer */}
          {selectedRawJson && (
            <div className="p-5 rounded-xl border border-cyan-900/60 bg-slate-950 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold font-mono text-cyan-400 border-b border-slate-900 pb-2">
                <span>Raw Log JSON Payload ({selectedRawJson.id})</span>
                <button onClick={() => setSelectedRawJson(null)} className="text-slate-500 hover:text-white">Close Drawer</button>
              </div>
              <pre className="p-4 rounded bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-cyan-300 overflow-x-auto">
                {selectedRawJson.rawJson || JSON.stringify(selectedRawJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        /* ReactFlow Threat Canvas */
        <div className="h-[600px] border border-slate-800 rounded-xl overflow-hidden bg-[#03050a] relative">
          {loadingCanvas && <LoadingSpinner label="Indexing threat propagation canvas..." />}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNode(node.data)}
            fitView
          >
            <Controls className="bg-slate-900 border border-slate-800 rounded p-1 text-white" />
            <MiniMap className="bg-slate-950 border border-slate-900 rounded" />
            <Background color="#1e293b" gap={24} size={1} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
