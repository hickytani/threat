'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Shield, Cpu, Activity, Zap, Lock, Server } from 'lucide-react';
import GlowCard from './GlowCard';

interface MetricItem {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
  desc: string;
  icon: any;
  color: 'cyan' | 'indigo' | 'emerald' | 'amber';
}

const METRICS: MetricItem[] = [
  { label: 'Pipeline Processing Target', value: 15, suffix: ' ms', desc: 'End-to-end normalization and rule evaluation', icon: Zap, color: 'cyan' },
  { label: 'Deduplication Window', value: 300, suffix: ' s', desc: 'Sliding-window duplicate suppression threshold', icon: Cpu, color: 'indigo' },
  { label: 'Detection Rule Fidelity', value: 100, suffix: '%', desc: 'Deterministic condition matching engine', icon: Shield, color: 'emerald' },
  { label: 'Audit Trail Retention', value: 100, suffix: '%', desc: 'Immutable server-side audit logs', icon: Lock, color: 'amber' },
];

export default function AnimatedMetrics() {
  const containerRef = useRef<HTMLDivElement>(null);
  const countersRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    METRICS.forEach((metric, idx) => {
      const el = countersRef.current[idx];
      if (!el) return;

      const targetVal = metric.value;
      const isDecimal = targetVal % 1 !== 0;

      const obj = { val: 0 };
      gsap.to(obj, {
        val: targetVal,
        duration: 2.2,
        ease: 'power2.out',
        onUpdate: () => {
          if (el) {
            el.innerText = isDecimal ? obj.val.toFixed(1) : Math.floor(obj.val).toLocaleString();
          }
        },
      });
    });
  }, []);

  return (
    <div ref={containerRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 my-16">
      {METRICS.map((m, idx) => {
        const Icon = m.icon;
        return (
          <GlowCard key={m.label} glowColor={m.color} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                {m.label}
              </span>
              <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1 font-mono my-2">
              {m.prefix && <span className="text-xl text-slate-400">{m.prefix}</span>}
              <span
                ref={(el) => { countersRef.current[idx] = el; }}
                className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight"
              >
                0
              </span>
              <span className="text-lg font-bold text-cyan-400">{m.suffix}</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mt-2">{m.desc}</p>
          </GlowCard>
        );
      })}
    </div>
  );
}
