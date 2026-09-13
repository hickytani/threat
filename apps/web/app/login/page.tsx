'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Key, Mail, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { apiRequest, persistSession } from '@/lib/api-client';
import type { AuthSession } from 'shared-types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('analyst@threatsync.local');
  const [password, setPassword] = useState('ThreatSyncSecured2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      persistSession(data);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Confirm the Python API is running on localhost:8000.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020817] px-4 py-12 sm:px-6 lg:px-8 relative font-sans overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 rounded-3xl border border-cyan-500/30 bg-slate-950/85 backdrop-blur-2xl p-8 relative z-10 shadow-2xl">
        
        {/* Title logo */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-xl shadow-cyan-500/20">
            <Shield className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="mt-4 text-2xl font-mono font-extrabold tracking-wider text-white">ThreatSync OS</h2>
          <p className="mt-1 text-xs font-mono text-slate-400">
            Defensive Security Operations & Threat Matrix
          </p>
        </div>

        {error && (
          <div className="flex gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs font-mono text-rose-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
            <div>
              <h5 className="font-bold text-white">Authentication Note</h5>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-5 font-mono" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Work Email
              </label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-3 py-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  placeholder="analyst@threatsync.local"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-3 py-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  placeholder="ThreatSyncSecured2026!"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id="remember-me"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
              />
              <span>Remember device</span>
            </label>
            <span className="text-cyan-400 text-[11px]">Developer Mode Active</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-3.5 text-xs font-mono uppercase tracking-widest transition-all focus:outline-none shadow-xl shadow-cyan-500/30 hover:scale-[1.02]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <span className="flex items-center gap-2">
                Authenticate Analyst Console <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>

        <div className="text-center text-xs font-mono text-slate-500 mt-6 pt-4 border-t border-slate-800">
          Demo Credentials Auto-Filled — Click <strong className="text-cyan-400">Authenticate</strong> to enter the SOC Analyst Console.
        </div>
      </div>
    </div>
  );
}
