'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { 
  Shield, 
  Terminal, 
  Activity, 
  Database, 
  Layers, 
  ArrowRight,
  Server,
  Key,
  FileSpreadsheet,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  Workflow,
  Lock,
  GitBranch,
  Search,
  Sliders,
  ExternalLink,
  Sparkles,
  Zap,
  Radio,
  Eye,
  ShieldAlert,
  Crosshair,
  Camera
} from 'lucide-react';

import CyberVideoBackdrop from '../components/CyberVideoBackdrop';
import GlowCard from '../components/GlowCard';
import InteractiveThreatRadar from '../components/InteractiveThreatRadar';
import MediaHeroShowcase from '../components/MediaHeroShowcase';
import AnimatedMetrics from '../components/AnimatedMetrics';
import InteractiveArchitecturePipeline from '../components/InteractiveArchitecturePipeline';
import BiometricCameraScanner from '../components/BiometricCameraScanner';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const capabilitiesGridRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance Animations for boxes appearing & fading smoothly
  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 35, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
      );
    }

    if (capabilitiesGridRef.current) {
      gsap.fromTo(
        capabilitiesGridRef.current.children,
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#020817] text-slate-100 font-sans overflow-x-hidden">
      {/* Full-Screen Dynamic Video & Image Canvas Backdrop */}
      <CyberVideoBackdrop />

      {/* Glassmorphic Header */}
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-2xl transition-all shadow-2xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-950/90 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Shield className="h-5 w-5 text-cyan-400 animate-pulse" />
            </div>
            <span className="font-mono font-extrabold text-base tracking-wider text-white flex items-center gap-1.5">
              THREATSYNC <span className="text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded text-xs border border-cyan-500/40">OS v2.4</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            <a href="#biometric" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-cyan-400" /> Biometric Scanner
            </a>
            <a href="#radar" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-ping" /> Real-time Radar
            </a>
            <a href="#pipeline" className="hover:text-cyan-400 transition-colors">SOC Pipeline</a>
            <a href="#capabilities" className="hover:text-cyan-400 transition-colors">Capabilities</a>
          </nav>

          <div className="flex items-center gap-3 font-mono">
            <Link 
              href="/login" 
              className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard" 
              className="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-xl shadow-cyan-500/30 hover:scale-105"
            >
              Launch Console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        
        {/* Hero Section */}
        <section ref={heroRef} className="text-center max-w-5xl mx-auto pt-8 pb-12">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-cyan-400/40 bg-cyan-950/70 backdrop-blur-xl text-cyan-400 text-xs font-mono font-extrabold uppercase tracking-widest mb-6 shadow-xl shadow-cyan-500/20">
            <Activity className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>FULL-STACK DEFENSIVE SECURITY OPERATIONS PLATFORM</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6 leading-none">
            DEFENSIVE SOC & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              DETERMINISTIC THREAT MATRIX
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-xl mb-10 max-w-3xl mx-auto leading-relaxed font-light">
            Engineered for high-density security event ingestion, sub-millisecond hash deduplication, automated correlation, explainable risk scoring, and server-side auditable response.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-5 max-w-lg mx-auto">
            <Link 
              href="/dashboard" 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-8 py-4 rounded-xl text-xs uppercase font-mono tracking-widest transition-all flex items-center justify-center gap-2.5 shadow-2xl shadow-cyan-500/40 hover:scale-105"
            >
              Open Analyst Console <ArrowRight className="h-4 w-4" />
            </Link>
            <a 
              href="#pipeline" 
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-cyan-500/30 font-bold px-8 py-4 rounded-xl text-xs uppercase font-mono tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-xl hover:border-cyan-400"
            >
              Explore Architecture
            </a>
          </div>
        </section>

        {/* Media Hero Showcase (3D Pointer Core & SOC Map) */}
        <MediaHeroShowcase />

        {/* GSAP Animated Metrics Bar */}
        <AnimatedMetrics />

        {/* Innovative Biometric Camera Scanner Section */}
        <section id="biometric">
          <BiometricCameraScanner />
        </section>

        {/* Real-time Interactive Threat Radar Widget */}
        <section id="radar" className="my-16">
          <InteractiveThreatRadar />
        </section>

        {/* Architectural Flow Pipeline Visualizer */}
        <section id="pipeline">
          <InteractiveArchitecturePipeline />
        </section>

        {/* Core SOC Capabilities Grid with GSAP Box Entrance */}
        <section id="capabilities" className="my-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-950/60 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest mb-3">
              <Zap className="h-4 w-4 text-cyan-400" /> DEFENSIVE CAPABILITIES
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Built for High-Density SOC Analyst Workflows
            </h2>
            <p className="text-sm text-slate-300 mt-2 font-mono">
              Deterministic rule execution, zero false positives, and fail-closed tenant boundary guards.
            </p>
          </div>

          <div ref={capabilitiesGridRef} className="grid md:grid-cols-3 gap-6">
            <GlowCard glowColor="cyan" className="p-7">
              <div className="h-12 w-12 rounded-xl bg-cyan-950/90 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-5 shadow-lg shadow-cyan-500/20">
                <Workflow className="h-6 w-6" />
              </div>
              <h3 className="font-mono font-extrabold text-lg text-white mb-2">SIEM Event Explorer</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Filter raw telemetry by event type, IP address, severity, and user identity. Displays threat propagation graph and paginated log stream.
              </p>
            </GlowCard>

            <GlowCard glowColor="indigo" className="p-7">
              <div className="h-12 w-12 rounded-xl bg-indigo-950/90 border border-indigo-500/50 flex items-center justify-center text-indigo-400 mb-5 shadow-lg shadow-indigo-500/20">
                <Terminal className="h-6 w-6" />
              </div>
              <h3 className="font-mono font-extrabold text-lg text-white mb-2">Alert Evidence Tracing</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Deep link into alert telemetry payload. Trace originating IP, target asset node, timestamp, and triggered rule condition with replay.
              </p>
            </GlowCard>

            <GlowCard glowColor="emerald" className="p-7">
              <div className="h-12 w-12 rounded-xl bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/20">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-mono font-extrabold text-lg text-white mb-2">Explainable Risk Matrix</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Risk scores are computed using transparent weighted scoring rule coefficients (Severity 40%, Asset Value 30%, Frequency 30%).
              </p>
            </GlowCard>

            <GlowCard glowColor="amber" className="p-7">
              <div className="h-12 w-12 rounded-xl bg-amber-950/90 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-5 shadow-lg shadow-amber-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="font-mono font-extrabold text-lg text-white mb-2">Hardened Multi-Tenancy</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Strict database level tenant key scoping. Prevents cross-organization data contamination with fail-closed NestJS guards.
              </p>
            </GlowCard>

            <GlowCard glowColor="rose" className="p-7">
              <div className="h-12 w-12 rounded-xl bg-rose-950/90 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-500/20">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="font-mono font-extrabold text-lg text-white mb-2">Server-Side Audit Trail</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Every analyst action, status change, rule update, and mitigation execution is logged immutably with timestamp and actor context.
              </p>
            </GlowCard>

            <GlowCard glowColor="cyan" className="p-7">
              <div className="h-12 w-12 rounded-xl bg-cyan-950/90 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-5 shadow-lg shadow-cyan-500/20">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="font-mono font-extrabold text-lg text-white mb-2">Async Pipeline Resilience</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Decoupled ingest pipeline backed by BullMQ & Redis queues handles millions of daily events with zero telemetry loss.
              </p>
            </GlowCard>
          </div>
        </section>

      </main>

      {/* Cyber Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-2xl py-12 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-cyan-400" />
            <div>
              <span className="font-mono font-extrabold text-sm text-white">THREATSYNC OS</span>
              <p className="text-xs text-slate-400 font-mono">Security Operations & Deterministic Threat Matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Cluster Status: Operational
            </span>
            <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
              Console
            </Link>
            <Link href="/login" className="hover:text-cyan-400 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
