import Link from 'next/link';
import { 
  Shield, 
  Terminal, 
  Activity, 
  Database, 
  BrainCircuit, 
  Users, 
  Layers, 
  ArrowRight,
  Server,
  Key,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#030712] text-slate-100 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#030712]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-bold text-lg tracking-wider text-white">THREATSYNC <span className="text-cyan-400">OS</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-medium text-sm px-4 py-2 rounded-md transition-all flex items-center gap-1 shadow-md shadow-cyan-500/10"
            >
              Request Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 border-b border-slate-900 bg-radial-gradient">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(0,0,0,0))] pointer-events-none" />
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Activity className="h-3.5 w-3.5 animate-pulse" /> ThreatSync Defensive Operations
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
            Detect faster. Investigate smarter.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Respond confidently.</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            The next-generation defensive Security Operations Center (SOC) platform designed for teams who need unified threat visibility, vulnerability auditing, and AI playbook recommendations without the enterprise bloat.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
            <Link 
              href="/register" 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-md transition-all shadow-lg shadow-cyan-500/20"
            >
              Get Started (Free)
            </Link>
            <Link 
              href="/login" 
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium px-6 py-3 rounded-md transition-colors"
            >
              Launch Platform
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-b border-slate-900 bg-[#02050c]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Centralized Command & Security Visibility</h2>
            <p className="text-slate-400">ThreatSync OS consolidates complex telemetry feeds into a structured, workflow-oriented operations board.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="premium-card p-6 rounded-lg">
              <div className="h-10 w-10 rounded-md bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-5">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Centralized Alert Ingestion</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ingest SIEM-style JSON logs, endpoint detections, and authentication logs via simple webhook adapters or direct API keys.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="premium-card p-6 rounded-lg">
              <div className="h-10 w-10 rounded-md bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-5">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Asset Exposure Registry</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Maintain continuous inventory of workstations, VM instances, cloud servers, and user accounts. Tracks vulnerabilities and active alerts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="premium-card p-6 rounded-lg">
              <div className="h-10 w-10 rounded-md bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-5">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">AI-Assisted Diagnostics</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate prompt summaries of complex alert feeds, trace attacker vectors, and extract playbooks with Gemini or offline fallbacks.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="premium-card p-6 rounded-lg">
              <div className="h-10 w-10 rounded-md bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-5">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">IOC Enrichment</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Investigate indicator details (IP addresses, hash patterns, domains, CVE keys) automatically resolved from cache or secure intelligence.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="premium-card p-6 rounded-lg">
              <div className="h-10 w-10 rounded-md bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-5">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Collaborative Incident Room</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Correlate alerts into isolated incident files. Assign SOC analysts, manage checklists, log activity feeds, and export reviews.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="premium-card p-6 rounded-lg">
              <div className="h-10 w-10 rounded-md bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-5">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Immutable Audit Logging</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Log every single analyst interaction, role modification, API key invocation, and data change for bulletproof compliance records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Detail */}
      <section id="architecture" className="py-20 border-b border-slate-900">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Enterprise SaaS Architecture</h2>
            <p className="text-slate-400">Strictly decoupled backend and frontend designed for security and scalability.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">NestJS API Core</h4>
                  <p className="text-sm text-slate-400 mt-1">A decoupled backend featuring REST modules, WebSocket gateways, and RBAC guards.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">HttpOnly Cookie JWT Rotation</h4>
                  <p className="text-sm text-slate-400 mt-1">Security-hardened login flow utilizing cookies. Complete session revocation support from the database.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Prisma DB multi-tenancy</h4>
                  <p className="text-sm text-slate-400 mt-1">Unified schema sharing with organization-scoped index filters. Built-in SQLite local fallback.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 space-y-2">
              <div className="text-cyan-400">// Unified ThreatSync Workspace Schema</div>
              <div>Root Workspace (npm workspaces)</div>
              <div>├── <span className="text-white">apps/web</span> &lt;Next.js App Router&gt;</div>
              <div>├── <span className="text-white">apps/api</span> &lt;NestJS REST Gateway&gt;</div>
              <div>└── <span className="text-white">packages/</span></div>
              <div className="pl-4">├── <span className="text-white">database/</span> &lt;Prisma schema & client&gt;</div>
              <div className="pl-4">└── <span className="text-white">shared-types/</span> &lt;Common typescript types&gt;</div>
              <div className="text-slate-600 mt-4">// Active Config: SQLite dev database & Mock queues</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#02050c] border-b border-slate-900">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-slate-950/60 p-5 rounded-lg border border-slate-850">
              <h4 className="font-semibold text-white mb-2">Is the platform strictly defensive?</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Yes. ThreatSync OS contains only defensive tools such as log aggregation, asset audit catalogs, indicators investigation, and collaboration playbooks. It does not contain any credential harvesting, exploits, payload, or bypass utilities.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-lg border border-slate-850">
              <h4 className="font-semibold text-white mb-2">Can it run without an AI provider key?</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Yes. If no Google Gemini or OpenAI API keys are provided in the environment variables, the system automatically falls back to an offline, deterministic cyber-intelligence mock engine. This makes it instantly functional for local testing.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-lg border border-slate-850">
              <h4 className="font-semibold text-white mb-2">How is multi-tenancy isolation enforced?</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every tenant model has an organization ID. All database query methods filter explicitly on the organization. A NestJS `TenantGuard` intercepts all requests to verify that the logged-in user belongs to the requested organization before any record returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#030712] text-sm text-slate-500 border-t border-slate-900">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} ThreatSync OS. Open Source Defensive SOC.
          </div>
          <div className="flex gap-4">
            <span className="text-rose-500/80 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Defensive use only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
