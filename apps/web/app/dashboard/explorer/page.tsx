'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Terminal,
  Activity,
  Cpu,
  Database,
  Network,
  AlertTriangle,
  ShieldAlert,
  Search,
  RefreshCw,
  Info,
  Server,
  Workflow
} from 'lucide-react';

export default function EventExplorer() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'logs'>('canvas');
  const [query, setQuery] = useState('severity:HIGH OR severity:CRITICAL');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // Graph Data States
  const [assets, setAssets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const apiUrl = useMemo(() => {
    return typeof window !== 'undefined'
      ? window.location.origin.includes('3000')
        ? 'http://localhost:3001/api/v1'
        : '/api/v1'
      : 'http://localhost:3001/api/v1';
  }, []);

  const fetchData = useCallback(async () => {
    setLoadingGraph(true);
    try {
      const [assetsRes, alertsRes, incidentsRes] = await Promise.all([
        fetch(`${apiUrl}/assets`),
        fetch(`${apiUrl}/alerts`),
        fetch(`${apiUrl}/incidents`),
      ]);

      if (assetsRes.ok && alertsRes.ok && incidentsRes.ok) {
        const assetsData = await assetsRes.json();
        const alertsData = await alertsRes.json();
        const incidentsData = await incidentsRes.json();

        setAssets(assetsData);
        setAlerts(alertsData);
        setIncidents(incidentsData);
        buildGraph(assetsData, alertsData, incidentsData);
      } else {
        throw new Error('Failed to load live catalog');
      }
    } catch (err) {
      console.warn('Backend not accessible, loading high-fidelity threat dataset simulation...');
      loadSimulatedData();
    } finally {
      setLoadingGraph(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load High-Fidelity Simulation Dataset
  const loadSimulatedData = () => {
    const simAssets = [
      { id: 'ast-dc', hostname: 'dc-01.threatsync.local', type: 'SERVER', ipAddress: '192.0.2.10', businessCriticality: 'CRITICAL', environment: 'PROD', activeAlertCount: 2 },
      { id: 'ast-db', hostname: 'db-prod-01', type: 'DATABASE', ipAddress: '192.0.2.20', businessCriticality: 'CRITICAL', environment: 'PROD', activeAlertCount: 1 },
      { id: 'ast-proxy', hostname: 'web-gateway-01', type: 'API', ipAddress: '203.0.113.15', businessCriticality: 'HIGH', environment: 'PROD', activeAlertCount: 1 },
      { id: 'ast-dev', hostname: 'user-win10-01', type: 'WORKSTATION', ipAddress: '192.0.2.101', businessCriticality: 'LOW', environment: 'DEV', activeAlertCount: 0 }
    ];

    const simAlerts = [
      { id: 'alrt-kerb', title: 'Failed administrator kerberos ticket request', category: 'AUTHENTICATION_ANOMALY', severity: 'HIGH', assetId: 'ast-dc', ipAddress: '192.0.2.10', timestamp: new Date(Date.now() - 300000).toISOString() },
      { id: 'alrt-shell', title: 'SQL Server process spawned cmd.exe command shell', category: 'ENDPOINT_ANOMALY', severity: 'CRITICAL', assetId: 'ast-db', ipAddress: '192.0.2.20', timestamp: new Date(Date.now() - 100000).toISOString() },
      { id: 'alrt-cve', title: 'Citrix CVE exploit payload matching pattern', category: 'VULNERABILITY_EXPLOITATION', severity: 'HIGH', assetId: 'ast-proxy', ipAddress: '203.0.113.15', timestamp: new Date().toISOString() }
    ];

    const simIncidents = [
      { id: 'inc-lateral', title: 'Correlated Security Incident: Multi-Asset Threat Group', severity: 'CRITICAL', summary: 'Lateral threat movement pattern: Active alert footprints detected across 3 distinct server assets.' }
    ];

    setAssets(simAssets);
    setAlerts(simAlerts);
    setIncidents(simIncidents);
    buildGraph(simAssets, simAlerts, simIncidents);
  };

  // Convert DB/Sim objects into React Flow Nodes/Edges
  const buildGraph = (assetsList: any[], alertsList: any[], incidentsList: any[]) => {
    const flowNodes: any[] = [];
    const flowEdges: any[] = [];

    // Helper map to count alert counts per asset dynamically
    const alertAssetsMap: Record<string, any[]> = {};
    alertsList.forEach((alert) => {
      if (alert.assetId) {
        if (!alertAssetsMap[alert.assetId]) alertAssetsMap[alert.assetId] = [];
        alertAssetsMap[alert.assetId].push(alert);
      }
    });

    let currentX = 100;
    let currentY = 150;

    // 1. Add Incident Nodes (Center / Top Layer)
    incidentsList.slice(0, 3).forEach((inc, idx) => {
      flowNodes.push({
        id: inc.id,
        type: 'default',
        position: { x: 400 + idx * 300, y: 50 },
        data: {
          label: (
            <div className="flex flex-col text-left font-sans text-xs">
              <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-red-400 animate-pulse" /> CORRELATED INCIDENT
              </span>
              <span className="font-bold text-white mt-0.5 truncate max-w-[180px]">{inc.title}</span>
              <span className="text-[10px] text-slate-400 mt-1 font-mono">{inc.severity} Severity</span>
            </div>
          ),
          raw: inc,
          nodeType: 'incident'
        },
        style: {
          background: 'rgba(12, 6, 12, 0.95)',
          border: '1.5px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          width: 220,
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.15)',
        }
      });
    });

    // 2. Add Asset Nodes (Lower Layer)
    currentX = 150;
    assetsList.forEach((asset, idx) => {
      const activeAlerts = alertAssetsMap[asset.id] || [];
      const hasCriticalAlerts = activeAlerts.some(a => a.severity === 'CRITICAL');
      const borderColor = hasCriticalAlerts 
        ? 'rgba(239, 68, 68, 0.5)' 
        : activeAlerts.length > 0 
          ? 'rgba(249, 115, 22, 0.5)' 
          : 'rgba(51, 65, 85, 0.8)';
      
      const shadowColor = hasCriticalAlerts 
        ? 'rgba(239, 68, 68, 0.1)' 
        : activeAlerts.length > 0 
          ? 'rgba(249, 115, 22, 0.08)' 
          : 'rgba(0, 0, 0, 0)';

      flowNodes.push({
        id: asset.id,
        type: 'default',
        position: { x: currentX, y: 480 },
        data: {
          label: (
            <div className="flex flex-col text-left font-sans text-xs">
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                {asset.type === 'DATABASE' ? <Database className="h-3 w-3 text-cyan-400" /> : <Server className="h-3 w-3 text-cyan-400" />} {asset.type}
              </span>
              <span className="font-bold text-white mt-0.5 truncate max-w-[160px]">{asset.hostname}</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{asset.ipAddress}</span>
            </div>
          ),
          raw: asset,
          nodeType: 'asset'
        },
        style: {
          background: 'rgba(10, 15, 28, 0.95)',
          border: `1.5px solid ${borderColor}`,
          borderRadius: '8px',
          width: 190,
          boxShadow: `0 0 12px ${shadowColor}`,
        }
      });
      currentX += 260;
    });

    // 3. Add Alert Nodes (Middle Layer) & Edges
    currentX = 100;
    alertsList.slice(0, 8).forEach((alert, idx) => {
      const isCritical = alert.severity === 'CRITICAL';
      const borderColor = isCritical ? 'rgba(239, 68, 68, 0.6)' : 'rgba(249, 115, 22, 0.6)';

      flowNodes.push({
        id: alert.id,
        type: 'default',
        position: { x: currentX + (idx % 2 === 0 ? 30 : -30), y: 260 + (idx % 2 * 60) },
        data: {
          label: (
            <div className="flex flex-col text-left font-sans text-xs">
              <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                isCritical ? 'text-red-400' : 'text-orange-400'
              }`}>
                <AlertTriangle className="h-3 w-3" /> ALERT • {alert.severity}
              </span>
              <span className="font-bold text-white mt-0.5 truncate max-w-[170px]">{alert.title}</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">{alert.category}</span>
            </div>
          ),
          raw: alert,
          nodeType: 'alert'
        },
        style: {
          background: 'rgba(15, 10, 10, 0.95)',
          border: `1.5px solid ${borderColor}`,
          borderRadius: '8px',
          width: 200,
          boxShadow: isCritical ? '0 0 10px rgba(239, 68, 68, 0.1)' : 'none',
        }
      });

      // Edge 1: Draw directed arrow from Alert Node to the Asset Node
      if (alert.assetId) {
        flowEdges.push({
          id: `edge-alert-asset-${alert.id}`,
          source: alert.id,
          target: alert.assetId,
          animated: true,
          style: { stroke: isCritical ? 'rgba(239, 68, 68, 0.7)' : 'rgba(249, 115, 22, 0.6)', strokeWidth: isCritical ? 2.5 : 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCritical ? '#ef4444' : '#f97316'
          }
        });
      }

      // Edge 2: Draw directed arrow from Alert Node to Incident (if escalated)
      if (alert.incidentId) {
        flowEdges.push({
          id: `edge-alert-incident-${alert.id}`,
          source: alert.id,
          target: alert.incidentId,
          style: { stroke: 'rgba(239, 68, 68, 0.35)', strokeDasharray: '5,5', strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ef4444'
          }
        });
      } else if (incidentsList.length > 0) {
        // Fallback: Connect simulated alerts to the simulated incident
        flowEdges.push({
          id: `edge-alert-sim-incident-${alert.id}`,
          source: alert.id,
          target: incidentsList[0].id,
          style: { stroke: 'rgba(239, 68, 68, 0.3)', strokeDasharray: '4,4', strokeWidth: 1.2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ef4444'
          }
        });
      }

      currentX += 240;
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const handleNodeClick = (event: React.MouseEvent, node: any) => {
    setSelectedNode(node.data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogs(true);
    
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
          source: 'PaloAltoFirewall',
          type: 'FIREWALL_LOG',
          message: 'Outbound TCP connection allowed to suspected Cobalt Strike C2 address',
          outcome: 'SUCCESS',
          ip: '198.51.100.99'
        },
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          source: 'DefenderAgent',
          type: 'EDR_PROCESS_SPAWN',
          message: 'SQL Server process spawned cmd.exe command shell execution',
          outcome: 'SUCCESS',
          ip: '192.0.2.20'
        }
      ]);
      setLoadingLogs(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      
      {/* Header and Toggle Bar */}
      <div className="border-b border-slate-900 bg-[#090d16] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <Workflow className="text-cyan-400 h-4.5 w-4.5" /> Security Threat Propagation Canvas
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Evaluate live asset telemetry mapping, lateral threat movements, and critical indicators of compromise.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded border border-slate-800 bg-slate-950 p-0.5">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-1 text-[10px] font-bold font-mono rounded transition-colors ${
              activeTab === 'canvas' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Threat Canvas
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-1 text-[10px] font-bold font-mono rounded transition-colors ${
              activeTab === 'logs' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            SIEM Log Search
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-0 flex relative">
        
        {activeTab === 'canvas' ? (
          <div className="flex-1 flex relative">
            {/* React Flow Canvas */}
            <div className="flex-1 h-full bg-[#03050a] relative">
              {loadingGraph && (
                <div className="absolute inset-0 bg-[#03050a]/90 flex items-center justify-center text-slate-400 z-10 font-mono text-xs">
                  <Activity className="h-4.5 w-4.5 animate-spin text-cyan-400 mr-2" /> Mapping threat nodes and correlation paths...
                </div>
              )}
              
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                fitView
                className="font-sans"
              >
                <Controls showInteractive={false} className="bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                <MiniMap 
                  nodeStrokeColor={() => '#111827'}
                  nodeColor={(node: any) => {
                    if (node.data?.nodeType === 'incident') return 'rgba(239, 68, 68, 0.4)';
                    if (node.data?.nodeType === 'alert') return 'rgba(249, 115, 22, 0.4)';
                    return 'rgba(6, 182, 212, 0.4)';
                  }}
                  className="bg-slate-950 border border-slate-900 rounded"
                />
                <Background color="#1e293b" gap={24} size={1} />
              </ReactFlow>
            </div>

            {/* Side Details Inspector Panel */}
            <div className="w-80 border-l border-slate-900 bg-[#0b0f19] p-4 flex flex-col justify-between overflow-y-auto flex-shrink-0">
              <div className="space-y-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-cyan-400" /> Selected Context Profile
                </div>

                {selectedNode ? (
                  <div className="space-y-4 text-xs font-sans">
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wider">Node Type</span>
                      <span className="font-bold text-white capitalize">{selectedNode.nodeType}</span>
                    </div>

                    {/* Incident Details */}
                    {selectedNode.nodeType === 'incident' && (
                      <div className="space-y-3">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Title</span>
                          <span className="text-white font-bold text-xs">{selectedNode.raw.title}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Severity</span>
                          <span className="text-red-400 font-bold font-mono">{selectedNode.raw.severity}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Symptom Summary</span>
                          <span className="text-slate-300 block mt-0.5 leading-relaxed">{selectedNode.raw.summary}</span>
                        </div>
                      </div>
                    )}

                    {/* Alert Details */}
                    {selectedNode.nodeType === 'alert' && (
                      <div className="space-y-3">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Detection Rule</span>
                          <span className="text-white font-bold text-xs">{selectedNode.raw.title}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Category</span>
                          <span className="text-slate-300 font-mono">{selectedNode.raw.category}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Trigger Severity</span>
                          <span className="text-orange-400 font-bold font-mono">{selectedNode.raw.severity}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Target Source IP</span>
                          <span className="text-cyan-400 font-mono font-semibold">{selectedNode.raw.ipAddress}</span>
                        </div>
                        {selectedNode.raw.timestamp && (
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Timestamp</span>
                            <span className="text-slate-400">{new Date(selectedNode.raw.timestamp).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Asset Details */}
                    {selectedNode.nodeType === 'asset' && (
                      <div className="space-y-3">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Hostname</span>
                          <span className="text-white font-bold text-xs">{selectedNode.raw.hostname}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">IPv4 Address</span>
                          <span className="text-cyan-400 font-mono font-semibold">{selectedNode.raw.ipAddress}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Criticality Level</span>
                          <span className="text-white font-mono">{selectedNode.raw.businessCriticality}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Environment Scope</span>
                          <span className="text-slate-300 font-semibold">{selectedNode.raw.environment}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Scope State</span>
                          <span className="text-slate-400">Monitoring Active</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-600 text-xs font-mono">
                    Click any node in the graph layout to inspect its context attributes.
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-mono text-[10px] py-2 rounded-md transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-index Canvas Nodes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            
            {/* SIEM Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 p-4 rounded-lg bg-[#0b0f19] border border-slate-900 max-w-4xl">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. severity:HIGH OR category:VULNERABILITY_EXPLOITATION"
                  className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-6 py-1.5 rounded transition-colors"
              >
                Query Logs
              </button>
            </form>

            {/* Results */}
            <div className="space-y-3 max-w-4xl">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Search Results</div>
              
              {loadingLogs ? (
                <div className="text-center py-12 text-slate-500">
                  <Activity className="h-4 w-4 animate-spin mx-auto text-cyan-400 mb-1" /> Searching event indices...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 rounded border border-slate-900 text-center text-xs text-slate-500 bg-slate-950/20 font-mono">
                  Execute search query above to fetch corresponding log events.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/60 border border-slate-900 rounded font-mono text-[11px] space-y-1.5 hover:border-slate-800 transition-colors">
                      <div className="flex justify-between text-slate-500">
                        <span className="font-bold text-slate-400">{log.type} ({log.source})</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-white font-medium">{log.message}</div>
                      <div className="text-[10px] text-slate-500">
                        Target IP: <span className="text-cyan-400 font-semibold">{log.ip}</span> • Sensor Outcome: <span className="text-red-400 font-bold">{log.outcome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
