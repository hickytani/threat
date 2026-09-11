'use client';

import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { 
  Database, 
  Cpu, 
  Workflow, 
  ShieldCheck, 
  Radio, 
  Terminal, 
  Layers, 
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import GlowCard from './GlowCard';

interface PipelineStep {
  step: string;
  title: string;
  subtitle: string;
  icon: any;
  tech: string;
  details: string;
  badge: string;
}

const STEPS: PipelineStep[] = [
  {
    step: '01',
    title: 'Ingestion Layer',
    subtitle: 'JSON Event Payload',
    icon: Database,
    tech: 'NestJS REST & Ingest Controller',
    details: 'Raw security events arrive via authenticated POST API endpoints. Payload schema is strictly validated against Zod types.',
    badge: 'API HTTP',
  },
  {
    step: '02',
    title: 'Deduplication',
    subtitle: 'Fingerprint Hashing',
    icon: Cpu,
    tech: 'SHA-256 Event Fingerprinting',
    details: 'Prevents log flood amplification by computing a deterministic hash key of (sourceIp, payloadHash, eventType).',
    badge: 'REDIS CACHE',
  },
  {
    step: '03',
    title: 'Async BullMQ Queue',
    subtitle: 'Decoupled Processing',
    icon: Layers,
    tech: 'Redis BullMQ Workers',
    details: 'Guarantees zero log loss during high-volume DDoS spikes by buffering telemetry in distributed Redis queues.',
    badge: 'BULLMQ',
  },
  {
    step: '04',
    title: 'Detection Rules',
    subtitle: 'Rule Engine Parsing',
    icon: Workflow,
    tech: 'Deterministic Logic Evaluator',
    details: 'Evaluates ingested logs against active detection rules (e.g. SSH brute force, JWT replay, cross-tenant leak).',
    badge: 'RULE ENGINE',
  },
  {
    step: '05',
    title: 'Alert Stream',
    subtitle: 'Confidence & Risk Scoring',
    icon: Radio,
    tech: 'Risk Matrix Algorithm',
    details: 'Calculates numeric risk score (0-100) based on severity, asset criticality, and historical threat frequency.',
    badge: 'RISK SCORER',
  },
  {
    step: '06',
    title: 'Threat Correlation',
    subtitle: 'Entity Graph Matcher',
    icon: ShieldCheck,
    tech: 'Prisma Graph Query Engine',
    details: 'Groups related alerts into a single cohesive Incident object when multiple assets or IPs share attack vectors.',
    badge: 'GRAPH ENGINE',
  },
  {
    step: '07',
    title: 'Incident Lifecycle',
    subtitle: 'Analyst State Workflow',
    icon: Terminal,
    tech: 'OPEN -> INVESTIGATING -> RESOLVED',
    details: 'Allows SOC analysts to manage incident lifecycle, assign responders, add notes, and execute automated containment.',
    badge: 'SOC CONSOLE',
  },
  {
    step: '08',
    title: 'Auditable Log Trail',
    subtitle: 'Fail-Closed Enforcement',
    icon: Lock,
    tech: 'PostgreSQL Immutable Audit',
    details: 'Every action taken by analysts or response playbooks is immutably logged for SOC compliance and governance.',
    badge: 'COMPLIANCE',
  },
];

export default function InteractiveArchitecturePipeline() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const detailRef = useRef<HTMLDivElement>(null);

  const handleStepSelect = (idx: number) => {
    setActiveStepIndex(idx);
    if (detailRef.current) {
      gsap.fromTo(
        detailRef.current,
        { opacity: 0, y: 15, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
  };

  const currentStep = STEPS[activeStepIndex];
  const StepIcon = currentStep.icon;

  return (
    <div className="w-full my-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest mb-3">
          <Sparkles className="h-3.5 w-3.5" /> ARCHITECTURAL PIPELINE
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          End-to-End Telemetry & Investigation Pipeline
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Click any phase below to inspect internal processing mechanics, data stores, and deterministic guards.
        </p>
      </div>

      {/* Grid of 8 Pipeline Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {STEPS.map((st, idx) => {
          const Icon = st.icon;
          const isActive = idx === activeStepIndex;
          return (
            <div
              key={st.step}
              onClick={() => handleStepSelect(idx)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                isActive
                  ? 'border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-105 z-10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-mono text-xs font-bold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {st.step}
                  </span>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                </div>
                <div className="font-bold text-xs text-white leading-tight mb-1">{st.title}</div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {st.badge}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Step Detail Box */}
      <div ref={detailRef}>
        <GlowCard glowColor="cyan" className="p-6 lg:p-8">
          <div className="grid md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <StepIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    PHASE {currentStep.step} — {currentStep.badge}
                  </span>
                  <h3 className="text-xl font-bold text-white">{currentStep.title}</h3>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">{currentStep.details}</p>

              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  <strong className="text-slate-500 block text-[9px] uppercase">Engine Component</strong>
                  {currentStep.tech}
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  <strong className="text-slate-500 block text-[9px] uppercase">Input/Output Contract</strong>
                  {currentStep.subtitle}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div className="text-right font-mono text-xs mb-4">
                <span className="text-slate-500 text-[10px] uppercase block">DETERMINISTIC GUARD</span>
                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1 justify-end">
                  <ShieldCheck className="h-4 w-4" /> VERIFIED & AUDITED
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepSelect((activeStepIndex - 1 + STEPS.length) % STEPS.length)}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700"
                >
                  PREV
                </button>
                <button
                  onClick={() => handleStepSelect((activeStepIndex + 1) % STEPS.length)}
                  className="px-3 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold text-xs font-mono hover:bg-cyan-400 flex items-center gap-1"
                >
                  NEXT <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
