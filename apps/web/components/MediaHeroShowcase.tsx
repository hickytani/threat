'use client';

import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { 
  Activity, 
  Workflow, 
  Cpu, 
  Sparkles, 
  Terminal, 
  Radio, 
  Move,
  ShieldCheck, 
  Zap, 
  Play, 
  Box
} from 'lucide-react';

import Interactive3DCyberCore from './Interactive3DCyberCore';

/* -------------------------------------------------------------------------- */
/*  1. HARDCODED Dynamic Vector World Map Canvas for SOC Command Center View  */
/* -------------------------------------------------------------------------- */
function SOCWorldMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const nodes = [
      { name: 'North America (NYC)', rx: 0.25, ry: 0.35, color: '#22d3ee' },
      { name: 'Europe (Frankfurt)', rx: 0.52, ry: 0.28, color: '#f43f5e' },
      { name: 'Asia East (Tokyo)', rx: 0.82, ry: 0.38, color: '#fbbf24' },
      { name: 'South America (São Paulo)', rx: 0.33, ry: 0.72, color: '#34d399' },
      { name: 'Australia (Sydney)', rx: 0.85, ry: 0.78, color: '#818cf8' },
      { name: 'Middle East (Dubai)', rx: 0.62, ry: 0.45, color: '#22d3ee' },
    ];

    interface Arc {
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
      color: string;
    }

    const arcs: Arc[] = [
      { fromIdx: 1, toIdx: 0, progress: 0, speed: 0.008, color: '#f43f5e' },
      { fromIdx: 2, toIdx: 0, progress: 0.3, speed: 0.006, color: '#22d3ee' },
      { fromIdx: 5, toIdx: 1, progress: 0.6, speed: 0.009, color: '#fbbf24' },
      { fromIdx: 0, toIdx: 4, progress: 0.1, speed: 0.005, color: '#818cf8' },
      { fromIdx: 3, toIdx: 1, progress: 0.8, speed: 0.007, color: '#34d399' },
    ];

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Render futuristic cyber grid background
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw faint world continent dots
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      for (let x = 0.1 * width; x < 0.9 * width; x += 18) {
        for (let y = 0.15 * height; y < 0.85 * height; y += 18) {
          const nx = x / width;
          const ny = y / height;
          const isLand =
            (nx > 0.18 && nx < 0.35 && ny > 0.2 && ny < 0.55) ||
            (nx > 0.28 && nx < 0.42 && ny > 0.55 && ny < 0.85) ||
            (nx > 0.45 && nx < 0.62 && ny > 0.18 && ny < 0.45) ||
            (nx > 0.45 && nx < 0.65 && ny > 0.45 && ny < 0.78) ||
            (nx > 0.62 && nx < 0.92 && ny > 0.18 && ny < 0.58) ||
            (nx > 0.78 && nx < 0.92 && ny > 0.65 && ny < 0.88);

          if (isLand) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw attack laser arcs with glowing pulses
      arcs.forEach((arc) => {
        const p1 = nodes[arc.fromIdx];
        const p2 = nodes[arc.toIdx];
        const x1 = p1.rx * width;
        const y1 = p1.ry * height;
        const x2 = p2.rx * width;
        const y2 = p2.ry * height;

        const cx = (x1 + x2) / 2;
        const cy = Math.min(y1, y2) - 60;

        ctx.save();
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();
        ctx.restore();

        arc.progress = (arc.progress + arc.speed) % 1;

        const t = arc.progress;
        const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
        const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

        ctx.save();
        ctx.fillStyle = arc.color;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        const prevT = Math.max(0, t - 0.05);
        const tx = (1 - prevT) * (1 - prevT) * x1 + 2 * (1 - prevT) * prevT * cx + prevT * prevT * x2;
        const ty = (1 - prevT) * (1 - prevT) * y1 + 2 * (1 - prevT) * prevT * cy + prevT * prevT * y2;

        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const nx = node.rx * width;
        const ny = node.ry * height;

        ctx.save();
        const ringRadius = ((time * 25) % 40) + 4;
        const ringAlpha = 1 - ringRadius / 40;
        ctx.strokeStyle = node.color;
        ctx.globalAlpha = ringAlpha;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(nx, ny, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1;
        ctx.fillRect(nx + 10, ny - 12, 140, 22);
        ctx.strokeRect(nx + 10, ny - 12, 140, 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(node.name, nx + 16, ny + 2);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

/* -------------------------------------------------------------------------- */
/*  2. Main MediaHeroShowcase Component featuring 3D Pointer Manipulated Core  */
/* -------------------------------------------------------------------------- */
export default function MediaHeroShowcase() {
  const [activeTab, setActiveTab] = useState<'3dcore' | 'command'>('3dcore');
  const [cliInput, setCliInput] = useState('');
  const [cliOutput, setCliOutput] = useState<string[]>([
    '[INIT] ThreatSync SOC Core Engine v2.4 initialized',
    '[SUCCESS] 3D Spatial Hyper-Shield Node Core Active',
    '[INFO] Click & drag pointer on 3D Object to rotate in 3D space.'
  ]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTabChange = (tabId: '3dcore' | 'command') => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0.3, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
  };

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput.trim().toLowerCase();
    const newLogs = [...cliOutput, `> ${cliInput}`];

    if (cmd === 'help') {
      newLogs.push('Available Commands: scan, isolate, correlate, spin, clear');
    } else if (cmd.startsWith('scan')) {
      newLogs.push('[SCANNING] 12 spatial nodes evaluated. All integrity guards passing.');
    } else if (cmd.startsWith('isolate')) {
      newLogs.push('[CONTAINED] Node k8s-pod-42 isolated.');
    } else if (cmd === 'clear') {
      setCliOutput(['[CLI] Console cleared.']);
      setCliInput('');
      return;
    } else {
      newLogs.push(`[EXEC] Executed: ${cliInput}`);
    }

    setCliOutput(newLogs.slice(-6));
    setCliInput('');
  };

  return (
    <div className="w-full relative my-12">
      {/* Outer Neon Glow Aura */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/40 via-indigo-500/40 to-emerald-500/40 blur-2xl opacity-80 animate-pulse pointer-events-none" />

      <div className="relative rounded-3xl border border-cyan-400/50 bg-slate-950/90 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-3.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
            <div className="h-3.5 w-3.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
            <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
            <span className="ml-2 font-mono text-xs text-slate-300 font-extrabold uppercase tracking-widest flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-ping" />
              THREATSYNC OS — LUXURY 3D POINTER-INTERACTIVE MATRIX
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => handleTabChange('3dcore')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all ${
                activeTab === '3dcore'
                  ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-cyan-500/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Box className="h-4 w-4" />
              3D Spin Cyber Core (Pointer Controlled)
            </button>

            <button
              onClick={() => handleTabChange('command')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all ${
                activeTab === 'command'
                  ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-cyan-500/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="h-4 w-4" />
              Global Attack Topology Map
            </button>
          </div>
        </div>

        {/* Graphic Box Container */}
        <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video md:aspect-[21/9] min-h-[440px] shadow-2xl">
          {activeTab === '3dcore' ? <Interactive3DCyberCore /> : <SOCWorldMapCanvas />}
        </div>

        {/* Live Telemetry Terminal Console Drawer */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs backdrop-blur-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-slate-400">
            <span className="flex items-center gap-2 text-cyan-400 font-bold">
              <Terminal className="h-4 w-4" /> INTERACTIVE SOC ANALYST CLI TERMINAL
            </span>
            <span className="text-[10px] text-slate-500">TYPE "help" OR "scan"</span>
          </div>

          <div className="space-y-1 text-slate-300 max-h-24 overflow-y-auto mb-3 font-mono">
            {cliOutput.map((log, i) => (
              <div key={i} className={log.startsWith('>') ? 'text-cyan-400 font-bold' : 'text-slate-300'}>
                {log}
              </div>
            ))}
          </div>

          <form onSubmit={handleCliSubmit} className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">$</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder="Try running: scan, isolate, correlate, clear..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs font-mono transition-all"
            >
              RUN
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
