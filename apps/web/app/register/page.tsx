'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Key, User, Building2, AlertCircle, ArrowRight, Loader2, Target, Users } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [orgSize, setOrgSize] = useState('1-50');
  const [securityGoal, setSecurityGoal] = useState('Centralized Alert Management');
  const [agree, setAgree] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError('You must agree to the defensive-use terms of service');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          organizationName,
          orgSize,
          securityGoal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      // Successful registration
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Connection to authentication service failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4 py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 premium-card p-8 rounded-xl relative z-10 border border-slate-800">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Create your SOC Workspace</h2>
          <p className="mt-2 text-sm text-slate-400">
            Register your organization on ThreatSync OS
          </p>
        </div>

        {error && (
          <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <h5 className="font-semibold text-white">Registration Error</h5>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-md border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Alex Rivera"
                />
              </div>
            </div>

            {/* Email */}
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
                  className="block w-full rounded-md border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="alex@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="md:col-span-2">
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
                  className="block w-full rounded-md border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            {/* Org Name */}
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-slate-300">
                Organization Name
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Building2 className="h-4 w-4" />
                </span>
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="block w-full rounded-md border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Apex Defense Ltd."
                />
              </div>
            </div>

            {/* Org Size */}
            <div>
              <label htmlFor="orgSize" className="block text-sm font-medium text-slate-300">
                Organization Size
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Users className="h-4 w-4" />
                </span>
                <select
                  id="orgSize"
                  value={orgSize}
                  onChange={(e) => setOrgSize(e.target.value)}
                  className="block w-full rounded-md border border-slate-700 bg-slate-900 pl-10 pr-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                >
                  <option value="1-50">1 - 50 members</option>
                  <option value="51-200">51 - 200 members</option>
                  <option value="201-1000">201 - 1000 members</option>
                  <option value="1000+">1000+ members</option>
                </select>
              </div>
            </div>

            {/* Primary Goal */}
            <div className="md:col-span-2">
              <label htmlFor="goal" className="block text-sm font-medium text-slate-300">
                Primary Security Objective
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Target className="h-4 w-4" />
                </span>
                <select
                  id="goal"
                  value={securityGoal}
                  onChange={(e) => setSecurityGoal(e.target.value)}
                  className="block w-full rounded-md border border-slate-700 bg-slate-900 pl-10 pr-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                >
                  <option value="Centralized Alert Management">Centralize alerts and event logging</option>
                  <option value="Compliance Mapping">Audit compliance assets and CVE exposure</option>
                  <option value="AI Assisted Investigation">Analyze network detections using AI models</option>
                  <option value="Team Incident Response">Collaborate on incident response checklists</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-start mt-4">
            <div className="flex h-5 items-center">
              <input
                id="agree"
                name="agree"
                type="checkbox"
                required
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-slate-950"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="agree" className="font-medium text-slate-300">
                I agree to use ThreatSync OS exclusively for defensive security monitoring.
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                We strictly prohibit the upload or analysis of actual malware, credentials harvesting, exploit files, or any offensive payloads.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/10 mt-6"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-1">
                Register Tenant <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
            Sign In to your Account
          </Link>
        </div>
      </div>
    </div>
  );
}
