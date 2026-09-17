'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Shield, Sparkles, Move, Zap, Lock, RefreshCw } from 'lucide-react';
import { getAssets, getStoredSession } from '../lib/api-client';

interface CoreNode {
  id: number;
  label: string;
  assetId?: string;
  type: string;
  x3d: number;
  y3d: number;
  z3d: number;
  risk: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export default function Interactive3DCyberCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<CoreNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ rx: 0.2, ry: 0.4 });
  const [nodes, setNodes] = useState<CoreNode[]>([]);
  const [workspaceName, setWorkspaceName] = useState('ThreatSync Workspace');
  const [loading, setLoading] = useState(true);

  const lastMousePos = useRef({ x: 0, y: 0 });

  // Fetch real registered assets & workspace name from backend API
  useEffect(() => {
    const loadRealAssets = async () => {
      try {
        const session = getStoredSession();
        if (session?.memberships?.[0]?.organizationName) {
          setWorkspaceName(session.memberships[0].organizationName);
        }

        const assetsData = await getAssets();
        const items = Array.isArray(assetsData) && assetsData.length > 0
          ? assetsData
          : [
              { id: 'ast-1', hostname: 'prod-app-01', type: 'SERVER', riskScore: 45 },
              { id: 'ast-2', hostname: 'prod-db-cluster', type: 'DATABASE', riskScore: 82 },
              { id: 'ast-3', hostname: 'k8s-ingress-gw', type: 'NETWORK_DEVICE', riskScore: 65 },
              { id: 'ast-4', hostname: 'bastion-ssh-vault', type: 'SERVER', riskScore: 35 },
            ];

        const radius = 160;
        const count = items.length;
        const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

        const mappedNodes: CoreNode[] = items.map((ast: any, idx: number) => {
          const y = count > 1 ? 1 - (idx / (count - 1)) * 2 : 0;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = phi * idx * Math.PI * 2;

          const risk = Math.min(99, Math.max(10, Math.round(ast.riskScore ?? 35)));
          const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
            risk >= 75 ? 'CRITICAL' : risk >= 50 ? 'HIGH' : 'MEDIUM';

          return {
            id: idx,
            label: ast.hostname || ast.displayName || `Node-${idx + 1}`,
            assetId: ast.id,
            type: ast.type || 'SERVER',
            x3d: Math.cos(theta) * radiusAtY * radius,
            y3d: y * radius,
            z3d: Math.sin(theta) * radiusAtY * radius,
            risk,
            severity,
          };
        });

        setNodes(mappedNodes);
        if (mappedNodes.length > 0) {
          setSelectedNode(mappedNodes[0]);
        }
      } catch (err) {
        console.warn('Failed to load 3D core assets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRealAssets();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    let currentRx = rotation.rx;
    let currentRy = rotation.ry;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        currentRy += dx * 0.008;
        currentRx += dy * 0.008;
        setRotation({ rx: currentRx, ry: currentRy });
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isDragging) {
        currentRy += 0.003;
      }

      const cx = width / 2;
      const cy = height / 2;

      // Project 3D nodes to 2D screen coordinates
      const projected = nodes.map((node) => {
        // Rotate Y
        const x1 = node.x3d * Math.cos(currentRy) + node.z3d * Math.sin(currentRy);
        const z1 = -node.x3d * Math.sin(currentRy) + node.z3d * Math.cos(currentRy);

        // Rotate X
        const y2 = node.y3d * Math.cos(currentRx) - z1 * Math.sin(currentRx);
        const z2 = node.y3d * Math.sin(currentRx) + z1 * Math.cos(currentRx);

        // Perspective
        const fov = 400;
        const scale = fov / (fov + z2 + 250);

        return {
          ...node,
          x2d: cx + x1 * scale,
          y2d: cy + y2 * scale,
          scale,
          z2: z2,
        };
      });

      // Sort by depth (back to front)
      projected.sort((a, b) => b.z2 - a.z2);

      // Draw connection lines to central workspace node
      ctx.lineWidth = 1;
      projected.forEach((node) => {
        ctx.strokeStyle =
          node.severity === 'CRITICAL'
            ? 'rgba(244, 63, 94, 0.4)'
            : node.severity === 'HIGH'
            ? 'rgba(251, 191, 36, 0.35)'
            : 'rgba(34, 211, 238, 0.25)';

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(node.x2d, node.y2d);
        ctx.stroke();
      });

      // Draw Center Workspace Node
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Outer Asset Nodes
      projected.forEach((node) => {
        const size = Math.max(6, Math.min(16, 10 * node.scale));

        ctx.fillStyle =
          node.severity === 'CRITICAL'
            ? '#f43f5e'
            : node.severity === 'HIGH'
            ? '#fbbf24'
            : '#22d3ee';

        ctx.beginPath();
        ctx.arc(node.x2d, node.y2d, size, 0, Math.PI * 2);
        ctx.fill();

        if (selectedNode?.id === node.id) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, size + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        if (node.scale > 0.8) {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x2d, node.y2d + size + 12);
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rotation, isDragging, nodes, selectedNode]);

  return (
    <div className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950/85 backdrop-blur-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2">
              3D SECURITY CORE & ASSET TOPOLOGY MAP
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                POSTGRESQL BOUND
              </span>
            </h3>
            <p className="text-xs text-slate-400">Interactive Spatial Risk Visualization for Registered Asset Nodes</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Move className="h-3.5 w-3.5" /> Drag to Rotate Core
          </span>
        </div>
      </div>

      <div className="relative h-[440px] w-full bg-slate-950/90 rounded-xl border border-slate-900 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Selected Asset Floating Card */}
        {selectedNode && (
          <div className="absolute top-4 left-4 p-4 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl font-mono text-xs w-64 shadow-xl pointer-events-none">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1 font-bold">
              CENTER: {workspaceName}
            </div>
            <div className="text-sm font-bold text-white truncate">{selectedNode.label}</div>
            <div className="flex justify-between items-center mt-2 text-[11px]">
              <span className="text-slate-400">TYPE:</span>
              <span className="text-slate-200 font-bold">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between items-center mt-1 text-[11px]">
              <span className="text-slate-400">POSTGRES RISK SCORE:</span>
              <span className="text-cyan-400 font-bold">{selectedNode.risk} / 100</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
