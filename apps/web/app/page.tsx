import Link from 'next/link';
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
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#030712] text-slate-100 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-[#030712]/90 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-bold text-base tracking-wider text-white">
              THREATSYNC <span className="text-cyan-400">OS</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <a href="#pipeline" className="hover:text-cyan-400 transition-colors">Pipeline</a>
            <a href="#capabilities" className="hover:text-cyan-400 transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-cyan-400 transition-colors">Architecture</a>
            <a href="#matrix" className="hover:text-cyan-400 transition-colors">Implementation Scope</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard" 
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-2 rounded transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
            >
              Launch Console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 border-b border-slate-900 bg-gradient-to-b from-slate-950 via-[#030712] to-[#030712]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.12),transparent_70%)] pointer-events-none" />
        <div className="container mx-auto px-6 text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-6">
            <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-400" /> Security Operations & Investigation Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
            Full-Stack Defensive SOC & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Deterministic Threat Correlation
            </span>
          </h1>
          
          <p className="text-slate-400 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Engineered for security event ingestion, deterministic detection, alert correlation, explainable risk scoring, incident investigation, and server-side auditable response.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <Link 
              href="/dashboard" 
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20"
            >
              Open Analyst Console <ArrowRight className="h-4 w-4" />
            </Link>
            <a 
              href="#architecture" 
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold px-6 py-3 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              View System Specs
            </a>
          </div>
        </div>
      </section>

      {/* Architectural Flow Pipeline Visual */}
      <section id="pipeline" className="py-20 border-b border-slate-900 bg-[#02050c]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 mb-2">Processing Flow</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">End-to-End Telemetry & Investigation Pipeline</h2>
            <p className="text-xs text-slate-400 mt-2">How security telemetry moves from ingestion to auditable incident containment.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-[11px]">
            {[
              { step: '01', title: 'Ingestion', desc: 'Normalized JSON' },
              { step: '02', title: 'Deduplication', desc: 'Hash fingerprinting' },
              { step: '03', title: 'BullMQ Queue', desc: 'Async Redis worker' },
              { step: '04', title: 'Detection', desc: 'Rule evaluation' },
              { step: '05', title: 'Alert Stream', desc: 'Confidence scoring' },
              { step: '06', title: 'Correlation', desc: 'Entity graph match' },
              { step: '07', title: 'Incident', desc: 'Lifecycle state' },
              { step: '08', title: 'Audit Log', desc: 'Fail-closed log' },
            ].map((st, idx) => (
              <div key={st.step} className="p-3 rounded border border-slate-800/80 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="text-cyan-400 font-bold text-[10px] mb-1">{st.step}</div>
                  <div className="text-white font-semibold text-xs leading-tight">{st.title}</div>
                </div>
                <div className="text-slate-500 text-[9.5px] mt-3 leading-tight">{st.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="capabilities" className="py-20 border-b border-slate-900">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 mb-2">SOC Capabilities</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Built for High-Density SOC Analyst Workflows</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="h-9 w-9 rounded bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-4">
                <Workflow className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">SIEM Event Explorer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter raw telemetry by event type, IP address, severity, and user identity. Displays threat propagation graph and paginated log stream.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="h-9 w-9 rounded bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-4">
                <Terminal className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">Alert Evidence Tracing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trace alerts back to exact triggering detection rules, confidence scores, raw security events, affected assets, and user identities.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="h-9 w-9 rounded bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-4">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">Incident Correlation Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Group related security alerts into isolated incident files. Prevents duplicate incidents and maintains auditable status transitions.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="h-9 w-9 rounded bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-4">
                <Cpu className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">Explainable Risk Scoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Computes asset risk posture deterministically based on active critical alerts, business criticality, and open vulnerability CVEs.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="h-9 w-9 rounded bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-4">
                <Database className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">Threat Intelligence & IOCs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Correlate IPs, domains, and file hashes against intelligence feeds (VirusTotal/AbuseIPDB provider abstraction with mock fallback).
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="h-9 w-9 rounded bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-4">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">Multi-Tenant Audit Trail</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict organization-level data isolation via TenantGuard and TenantScopedRepository with complete audit log traceability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Monorepo Architecture */}
      <section id="architecture" className="py-20 border-b border-slate-900 bg-[#02050c]">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-14">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 mb-2">System Design</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Monorepo Stack Architecture</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded border border-slate-800 bg-slate-950/60">
                <div className="text-cyan-400 font-bold mb-1">// Frontend Layer (apps/web)</div>
                <div className="text-slate-300">Next.js 14 App Router, React, Tailwind CSS, Lucide icons, Recharts, ReactFlow</div>
              </div>
              <div className="p-4 rounded border border-slate-800 bg-slate-950/60">
                <div className="text-cyan-400 font-bold mb-1">// Centralized API Client (apps/web/lib/api-client.ts)</div>
                <div className="text-slate-300">Typed HTTP client with session authorization headers and error propagation</div>
              </div>
              <div className="p-4 rounded border border-slate-800 bg-slate-950/60">
                <div className="text-cyan-400 font-bold mb-1">// Core API (apps/api)</div>
                <div className="text-slate-300">NestJS REST controllers, JwtAuthGuard, TenantGuard, Domain Services</div>
              </div>
              <div className="p-4 rounded border border-slate-800 bg-slate-950/60">
                <div className="text-cyan-400 font-bold mb-1">// Background Queue & Database</div>
                <div className="text-slate-300">BullMQ Redis worker, Prisma ORM, SQLite/PostgreSQL schema, Shared Types package</div>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono text-xs text-slate-400 space-y-2">
              <div className="text-cyan-400">// Project Directory Structure</div>
              <div className="text-white">threat/</div>
              <div>├── <span className="text-cyan-300">apps/</span></div>
              <div>│   ├── <span className="text-white">api/</span> <span className="text-slate-600">(NestJS REST API & Queue Worker)</span></div>
              <div>│   └── <span className="text-white">web/</span> <span className="text-slate-600">(Next.js SOC Analyst Console)</span></div>
              <div>├── <span className="text-cyan-300">packages/</span></div>
              <div>│   ├── <span className="text-white">database/</span> <span className="text-slate-600">(Prisma Schema, Client & Seeder)</span></div>
              <div>│   └── <span className="text-white">shared-types/</span> <span className="text-slate-600">(TypeScript Interfaces)</span></div>
              <div>└── <span className="text-cyan-300">docs/</span></div>
              <div>    ├── <span className="text-slate-300">ARCHITECTURE.md</span></div>
              <div>    ├── <span className="text-slate-300">SECURITY_MODEL.md</span></div>
              <div>    ├── <span className="text-slate-300">EVENT_PIPELINE.md</span></div>
              <div>    ├── <span className="text-slate-300">INVESTIGATION.md</span></div>
              <div>    └── <span className="text-slate-300">LIMITATIONS.md</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Scope Matrix Table */}
      <section id="matrix" className="py-20 border-b border-slate-900">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 mb-2">Scope Transparency</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Implementation vs Scope Boundaries</h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/60 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Capability</th>
                  <th className="p-3.5">Implementation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300 bg-slate-950/40">
                <tr><td className="p-3">Security Event Ingestion & Normalization</td><td className="p-3 text-emerald-400 font-bold">Implemented</td></tr>
                <tr><td className="p-3">Deterministic Rule Detection & Correlation</td><td className="p-3 text-emerald-400 font-bold">Implemented</td></tr>
                <tr><td className="p-3">Incident Lifecycle & Audit History</td><td className="p-3 text-emerald-400 font-bold">Implemented</td></tr>
                <tr><td className="p-3">Explainable Risk Scoring Formula</td><td className="p-3 text-emerald-400 font-bold">Implemented</td></tr>
                <tr><td className="p-3">BullMQ Async Queue & Worker Retries</td><td className="p-3 text-emerald-400 font-bold">Implemented</td></tr>
                <tr><td className="p-3">Tenant Guard & Fail-Closed Authorization</td><td className="p-3 text-emerald-400 font-bold">Implemented</td></tr>
                <tr><td className="p-3">External Threat Intel (VirusTotal/AbuseIPDB)</td><td className="p-3 text-amber-400">Provider Abstraction / Local Fallback</td></tr>
                <tr><td className="p-3">Live Production EDR / SIEM Connectors</td><td className="p-3 text-slate-500">Out of Scope (Demo Seeder Provided)</td></tr>
                <tr><td className="p-3">Autonomous Remediation Actions</td><td className="p-3 text-slate-500">Out of Scope (Analyst Driven)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#030712] text-xs text-slate-500 border-t border-slate-900">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span>&copy; {new Date().getFullYear()} ThreatSync OS — Portfolio Engineering Project.</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/dashboard" className="hover:text-white transition-colors">Console</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
