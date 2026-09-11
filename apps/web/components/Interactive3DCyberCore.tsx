'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Shield, Sparkles, Move, Zap, Lock, RefreshCw } from 'lucide-react';

interface CoreNode {
  id: number;
  label: string;
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
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Generate 3D Icosahedron / Geodesic Sphere vertices
  const nodesRef = useRef<CoreNode[]>([]);

  useEffect(() => {
    if (nodesRef.current.length === 0) {
      const labels = [
        'AUTH-VAL-01', 'API-GW-MAIN', 'SQL-CLUSTER-PROD',
        'K8S-INGRESS-01', 'OKTA-IDP-SYNC', 'BASTION-SSH-VAULT',
        'S3-STORAGE-VAULT', 'REDIS-CACHE-WORKER', 'CONTAINER-RUNC-01',
        'MALWARE-C2-GATEWAY', 'DNS-BEACON-DETECTOR', 'ZERO-TRUST-GUARD'
      ];
      const severities: ('CRITICAL' | 'HIGH' | 'MEDIUM')[] = ['CRITICAL', 'HIGH', 'MEDIUM'];

      const radius = 160;
      const count = labels.length;
      const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

      nodesRef.current = labels.map((label, idx) => {
        // Fibonacci sphere point distribution
        const y = 1 - (idx / (count - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * idx * Math.PI * 2;

        return {
          id: idx,
          label,
          x3d: Math.cos(theta) * radiusAtY * radius,
          y3d: y * radius,
          z3d: Math.sin(theta) * radiusAtY * radius,
          risk: Math.floor(65 + Math.random() * 32),
          severity: severities[idx % 3],
        };
      });
    }
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

    // Target rotation (smooth interpolation)
    let currentRx = rotation.rx;
    let currentRy = rotation.ry;

    // Mouse pointer interaction
    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDragging) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        currentRy += dx * 0.008;
        currentRx += dy * 0.008;
        setRotation({ rx: currentRx, ry: currentRy });
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      } else {
        // Subtle pointer tilt when hovering
        const offsetX = (mouseX - width / 2) / (width / 2);
        const offsetY = (mouseY - height / 2) / (height / 2);
        currentRy += (offsetX * 0.02 - currentRy + rotation.ry) * 0.05;
        currentRx += (-offsetY * 0.02 - currentRx + rotation.rx) * 0.05;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    let frame = 0;

    const render = () => {
      frame++;
      // Auto slight rotation if not dragging
      if (!isDragging) {
        currentRy += 0.003;
      }

      ctx.clearRect(0, 0, width, height);

      // Deep dark luxury gradient background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.2);
      bgGrad.addColorStop(0, '#040b1e');
      bgGrad.addColorStop(0.6, '#020617');
      bgGrad.addColorStop(1, '#01030a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render 3D HUD Rings in background
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.lineWidth = 1;

      // Ring 1
      ctx.beginPath();
      ctx.ellipse(0, 0, 240, 70, currentRy * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 290, 90, -currentRy * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Project 3D Nodes
      const projectedNodes = nodesRef.current.map((n) => {
        // Rotate around Y axis
        let x1 = n.x3d * Math.cos(currentRy) - n.z3d * Math.sin(currentRy);
        let z1 = n.x3d * Math.sin(currentRy) + n.z3d * Math.cos(currentRy);

        // Rotate around X axis
        let y1 = n.y3d * Math.cos(currentRx) - z1 * Math.sin(currentRx);
        let z2 = n.y3d * Math.sin(currentRx) + z1 * Math.cos(currentRx);

        // Perspective scale factor
        const perspective = 500;
        const scale = perspective / (perspective + z2);

        const screenX = width / 2 + x1 * scale;
        const screenY = height / 2 + y1 * scale;

        return {
          ...n,
          screenX,
          screenY,
          scale,
          z2,
        };
      });

      // Sort by Z for proper depth rendering
      projectedNodes.sort((a, b) => b.z2 - a.z2);

      // Draw Connecting 3D Laser Vectors
      ctx.save();
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];

          const dx = n1.x3d - n2.x3d;
          const dy = n1.y3d - n2.y3d;
          const dz = n1.z3d - n2.z3d;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 220) {
            const alpha = (1 - dist / 220) * Math.min(n1.scale, n2.scale) * 0.45;
            ctx.strokeStyle = n1.severity === 'CRITICAL' || n2.severity === 'CRITICAL'
              ? `rgba(244, 63, 94, ${alpha})`
              : `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 1.2 * n1.scale;

            ctx.beginPath();
            ctx.moveTo(n1.screenX, n1.screenY);
            ctx.lineTo(n2.screenX, n2.screenY);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Draw Center Core Energy Orb
      ctx.save();
      ctx.translate(width / 2, height / 2);
      const orbGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
      orbGrad.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
      orbGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
      orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 45 + Math.sin(frame * 0.05) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw 3D Nodes
      projectedNodes.forEach((node) => {
        const radius = Math.max(3, 8 * node.scale);
        const nodeColor = node.severity === 'CRITICAL' ? '#f43f5e' : node.severity === 'HIGH' ? '#fbbf24' : '#22d3ee';

        ctx.save();
        ctx.fillStyle = nodeColor;
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 15 * node.scale;

        // Draw Node Point
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Node halo ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1 * node.scale;
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, radius + 3 * node.scale, 0, Math.PI * 2);
        ctx.stroke();

        // Node Label for front-facing nodes
        if (node.scale > 0.95) {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
          ctx.strokeStyle = nodeColor;
          ctx.lineWidth = 1;

          const textWidth = ctx.measureText(node.label).width + 16;
          ctx.fillRect(node.screenX + 10, node.screenY - 10, textWidth, 20);
          ctx.strokeRect(node.screenX + 10, node.screenY - 10, textWidth, 20);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(node.label, node.screenX + 18, node.screenY + 3);
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animId);
    };
  }, [isDragging, rotation]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-3xl overflow-hidden group select-none">
      {/* 3D Interactive Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Instruction Badge */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none z-10">
        <div className="px-4 py-2 rounded-2xl bg-slate-950/85 border border-cyan-400/50 backdrop-blur-2xl text-cyan-400 text-xs font-mono font-extrabold flex items-center gap-2 shadow-2xl">
          <Move className="h-4 w-4 animate-bounce text-cyan-400" />
          POINTER CONTROL: CLICK & DRAG TO SPIN 3D CORE
        </div>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 z-10 font-mono text-xs">
        <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-indigo-500/40 backdrop-blur-2xl text-indigo-300 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          PARALLEL NODE CORRELATION
        </div>
      </div>

      {/* Bottom Floating Stats Panel */}
      <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3 font-mono">
          <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              HYPER-SHIELD 3D NODE MATRIX
            </h4>
            <p className="text-[11px] text-slate-400">
              Interactive 3D spatial threat vector topology mapping 12 cluster nodes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase">3D SPATIAL ACCURACY</span>
            <span className="text-emerald-400 font-bold">100% REAL-TIME</span>
          </div>
        </div>
      </div>
    </div>
  );
}
