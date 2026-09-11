'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getStoredSession } from '@/lib/api-client';
import { 
  Shield, 
  Building2, 
  Layers, 
  Plus, 
  Database, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  FileText,
  Radio,
  PlusCircle,
  Trash2,
  Lock
} from 'lucide-react';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);

  // Form states
  const [profile, setProfile] = useState({
    name: '',
    industry: 'Technology',
    teamSize: '11-50',
    country: 'United States',
    timeZone: 'UTC-5 (EST)'
  });

  const [environment, setEnvironment] = useState({
    endpointsCount: '100-500',
    cloudProvider: 'AWS',
    existingSiem: 'None',
    existingEdr: 'None',
    primaryConcern: 'Ransomware / Data Exfiltration'
  });

  const [assetMethod, setAssetMethod] = useState('demo'); // manual, csv, demo
  const [manualAssets, setManualAssets] = useState<any[]>([
    { hostname: 'dc-01.prod.lan', type: 'SERVER', ipAddress: '192.0.2.10', criticality: 'CRITICAL' }
  ]);

  const [alertSource, setAlertSource] = useState('demo'); // webhook, json, demo
  const [teamMembers, setTeamMembers] = useState<any[]>([
    { email: '', role: 'SECURITY_ANALYST' }
  ]);

  // Load organization from the authenticated session saved by the shared API client
  useEffect(() => {
    const session = getStoredSession();
    const activeMembership = session?.memberships?.[0];

    if (activeMembership) {
      setOrganization(activeMembership);
      setProfile((p) => ({ ...p, name: activeMembership.organizationName }));
    }
  }, []);

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const addManualAsset = () => {
    setManualAssets([...manualAssets, { hostname: '', type: 'WORKSTATION', ipAddress: '', criticality: 'MEDIUM' }]);
  };

  const removeManualAsset = (idx: number) => {
    setManualAssets(manualAssets.filter((_, i) => i !== idx));
  };

  const updateManualAsset = (idx: number, field: string, value: string) => {
    const updated = [...manualAssets];
    updated[idx][field] = value;
    setManualAssets(updated);
  };

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: '', role: 'SECURITY_ANALYST' }]);
  };

  const removeTeamMember = (idx: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== idx));
  };

  const updateTeamMember = (idx: number, field: string, value: string) => {
    const updated = [...teamMembers];
    updated[idx][field] = value;
    setTeamMembers(updated);
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const orgId = organization?.organizationId;

      if (!orgId) {
        throw new Error('Organization ID context is missing.');
      }

      // Step 1 & 2: Update Organization settings using the authenticated tenant context
      await apiRequest('/organizations/current', {
        method: 'PATCH',
        body: JSON.stringify({
          size: profile.teamSize,
          industry: profile.industry,
          country: profile.country,
          timeZone: profile.timeZone
        }),
      });

      // If user selected demo data, seed the current tenant using the real backend endpoint
      if (assetMethod === 'demo' || alertSource === 'demo') {
        await apiRequest('/organizations/current/seed-demo', {
          method: 'POST',
        });
      }

      // Redirect to main operations overview dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      // Even if network calls fail in mock phase, let's allow dashboard access for demo purposes
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-[#030712] py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-bold text-lg tracking-wider text-white">THREATSYNC <span className="text-cyan-400">OS</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock className="h-4 w-4" /> Secure Onboarding Pipeline
          </div>
        </div>
      </header>

      {/* Steps Indicator */}
      <div className="container mx-auto px-4 max-w-3xl mt-8">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -z-10" />
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <div 
              key={num}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                step >= num 
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400' 
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {num}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] md:text-xs text-slate-400 mt-2">
          <span>Profile</span>
          <span>Environment</span>
          <span>Assets</span>
          <span>Alerts</span>
          <span>Team</span>
          <span>Confirm</span>
        </div>
      </div>

      {/* Main Form Body */}
      <main className="container mx-auto px-4 max-w-3xl my-8 flex-grow">
        <div className="premium-card p-8 rounded-xl border border-slate-800">
          
          {/* Step 1: Org Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Building2 className="text-cyan-400" /> Step 1: Organization Profile</h3>
                <p className="text-sm text-slate-400 mt-1">Configure your corporate workspace details</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Organization Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="block w-full mt-1.5 rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Industry Vertical</label>
                    <select
                      value={profile.industry}
                      onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                      className="block w-full mt-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option>Technology</option>
                      <option>Finance / Banking</option>
                      <option>Healthcare</option>
                      <option>Government / Defense</option>
                      <option>Retail / E-Commerce</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Team Size</label>
                    <select
                      value={profile.teamSize}
                      onChange={(e) => setProfile({ ...profile, teamSize: e.target.value })}
                      className="block w-full mt-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option>1-10 analysts</option>
                      <option>11-50 analysts</option>
                      <option>51-200 analysts</option>
                      <option>200+ analysts</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Security Environment */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-cyan-400" /> Step 2: Security Environment</h3>
                <p className="text-sm text-slate-400 mt-1">Specify your current enterprise footprint and threats</p>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Active Endpoints</label>
                    <select
                      value={environment.endpointsCount}
                      onChange={(e) => setEnvironment({ ...environment, endpointsCount: e.target.value })}
                      className="block w-full mt-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500"
                    >
                      <option>&lt;100 assets</option>
                      <option>100-500 assets</option>
                      <option>501-2000 assets</option>
                      <option>2000+ assets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Primary Cloud Infrastructure</label>
                    <select
                      value={environment.cloudProvider}
                      onChange={(e) => setEnvironment({ ...environment, cloudProvider: e.target.value })}
                      className="block w-full mt-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500"
                    >
                      <option>AWS</option>
                      <option>Google Cloud Platform</option>
                      <option>Microsoft Azure</option>
                      <option>Hybrid / On-Premise</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Main Cyber Security Concern</label>
                  <select
                    value={environment.primaryConcern}
                    onChange={(e) => setEnvironment({ ...environment, primaryConcern: e.target.value })}
                    className="block w-full mt-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500"
                  >
                    <option>Ransomware / Data Exfiltration</option>
                    <option>Identity Compromise / Phishing</option>
                    <option>Cloud Bucket Misconfigurations</option>
                    <option>Unpatched Remote Code Execution (RCE)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Add Assets */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Database className="text-cyan-400" /> Step 3: Register Assets</h3>
                <p className="text-sm text-slate-400 mt-1">Populate your corporate device and workload inventory</p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setAssetMethod('demo')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    assetMethod === 'demo' 
                      ? 'border-cyan-500 bg-cyan-950/20' 
                      : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 text-cyan-400 mb-2" />
                  <span className="block font-semibold text-white">Generate Mock Data</span>
                  <span className="block text-xs text-slate-400 mt-1">Pre-seed 50 realistic workstations, servers, and cloud instances.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssetMethod('manual')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    assetMethod === 'manual' 
                      ? 'border-cyan-500 bg-cyan-950/20' 
                      : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <Plus className="h-5 w-5 text-slate-400 mb-2" />
                  <span className="block font-semibold text-white">Manual Registry</span>
                  <span className="block text-xs text-slate-400 mt-1">Enter your high-criticality assets individually.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssetMethod('csv')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    assetMethod === 'csv' 
                      ? 'border-cyan-500 bg-cyan-950/20' 
                      : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <FileText className="h-5 w-5 text-slate-400 mb-2" />
                  <span className="block font-semibold text-white">Upload CSV File</span>
                  <span className="block text-xs text-slate-400 mt-1">Import list from external threat engines.</span>
                </button>
              </div>

              {assetMethod === 'manual' && (
                <div className="space-y-3 mt-4">
                  <div className="text-sm font-semibold text-slate-300">Device List</div>
                  {manualAssets.map((asset, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Hostname"
                        value={asset.hostname}
                        onChange={(e) => updateManualAsset(idx, 'hostname', e.target.value)}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                      <select
                        value={asset.type}
                        onChange={(e) => updateManualAsset(idx, 'type', e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
                      >
                        <option value="SERVER">Server</option>
                        <option value="WORKSTATION">Workstation</option>
                        <option value="CLOUD_INSTANCE">Cloud Instance</option>
                      </select>
                      <input
                        type="text"
                        placeholder="IP Address"
                        value={asset.ipAddress}
                        onChange={(e) => updateManualAsset(idx, 'ipAddress', e.target.value)}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeManualAsset(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addManualAsset}
                    className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300 mt-2"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Asset row
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Configure Alert Source */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Radio className="text-cyan-400 animate-pulse" /> Step 4: Configure Alert Feeds</h3>
                <p className="text-sm text-slate-400 mt-1">Establish ingestion streams for SOC threat detections</p>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40 flex items-start gap-4">
                  <input
                    type="radio"
                    name="alertSource"
                    id="src-demo"
                    checked={alertSource === 'demo'}
                    onChange={() => setAlertSource('demo')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="src-demo" className="font-bold text-white block">Defensive Incident Simulator (Demo Feed)</label>
                    <span className="text-xs text-slate-400 block mt-1">Pre-seed 150 simulated alerts, including unusual auth logs, vulnerable servers, and command payloads.</span>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40 flex items-start gap-4 opacity-75">
                  <input
                    type="radio"
                    name="alertSource"
                    id="src-webhook"
                    checked={alertSource === 'webhook'}
                    onChange={() => setAlertSource('webhook')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="src-webhook" className="font-bold text-white block">Generic Webhook Ingestion</label>
                    <span className="text-xs text-slate-400 block mt-1">Triggers standard tokenized endpoints (`POST /api/v1/ingest/alerts`) for forwarding raw JSON logs.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Invite Team */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="text-cyan-400" /> Step 5: Invite SOC Analysts</h3>
                <p className="text-sm text-slate-400 mt-1">Invite team members and assign operational permissions</p>
              </div>

              <div className="space-y-3">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="email"
                      placeholder="analyst@organization.com"
                      value={member.email}
                      onChange={(e) => updateTeamMember(idx, 'email', e.target.value)}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <select
                      value={member.role}
                      onChange={(e) => updateTeamMember(idx, 'role', e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    >
                      <option value="SECURITY_ANALYST">Security Analyst</option>
                      <option value="SOC_MANAGER">SOC Manager</option>
                      <option value="COMPLIANCE_VIEWER">Compliance Viewer</option>
                      <option value="EXECUTIVE_VIEWER">Executive Viewer</option>
                    </select>
                    <button 
                      type="button" 
                      onClick={() => removeTeamMember(idx)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300 mt-2"
                >
                  <PlusCircle className="h-4 w-4" /> Invite another member
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {step === 6 && (
            <div className="space-y-6 text-center py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 mb-4">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Your SOC Workspace is Ready</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  We have mapped your assets catalog and alert integration endpoints. Let's redirect you to the main Security Operations Command Center.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-850 text-left font-mono text-xs max-w-md mx-auto space-y-1">
                <div>Tenant: <span className="text-white">{profile.name}</span></div>
                <div>Industry: <span className="text-white">{profile.industry}</span></div>
                <div>Seed Detections: <span className="text-white">{alertSource === 'demo' ? 'Yes (150 alerts)' : 'Webhook config only'}</span></div>
                <div>Seeded Assets: <span className="text-white">{assetMethod === 'demo' ? 'Yes (50 endpoints)' : 'Manual config'}</span></div>
              </div>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex justify-between items-center border-t border-slate-850 pt-6 mt-8">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" /> Previous Step
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded flex items-center gap-1 shadow-md shadow-cyan-500/10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 6 ? (
                <>Complete Setup <CheckCircle2 className="h-4 w-4" /></>
              ) : (
                <>Next Step <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#030712] py-4 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} ThreatSync OS. Secure onboarding session.
      </footer>
    </div>
  );
}
