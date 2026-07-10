'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Key, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse customized API error response
        throw new Error(data.error?.message || 'Invalid credentials or login failed');
      }

      // Successful login
      // Token cookies access_token/refresh_token are set automatically as HttpOnly by backend.
      // Store user metadata locally if needed.
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('memberships', JSON.stringify(data.memberships));
      
      // Redirect to main onboarding setup wizard or dashboard
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Connection to authentication service failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4 py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 premium-card p-8 rounded-xl relative z-10 border border-slate-800">
        {/* Title logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign in to ThreatSync OS</h2>
          <p className="mt-2 text-sm text-slate-400">
            Access your secure Defensive Security Operations workspace
          </p>
        </div>

        {error && (
          <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <h5 className="font-semibold text-white">Authentication Failed</h5>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Work Email
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-slate-950"
              />
              <label htmlFor="remember-me" className="ml-2 block text-slate-400">
                Remember device
              </label>
            </div>
            <Link href="/forgot" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/10"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-1">
                Authenticate <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 mt-6">
          New to ThreatSync OS?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
            Register your Organization
          </Link>
        </div>
      </div>
    </div>
  );
}
