'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getStoredSession, createIngestionCredential, getIngestionCredentials } from '@/lib/api-client';
import { 
  Shield, 
  Building2, 
  Layers, 
  Plus, 
  Database, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2,
  Radio,
  PlusCircle,
  Trash2,
  Lock,
  Copy,
  Check,
  Terminal
} from 'lucide-react';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [credentialToken, setCredentialToken] = useState<string>('');
  const [copied, setCopied] = useState(false);

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

  const [assetMethod, setAssetMethod] = useState<'demo' | 'manual'>('demo');
  const [manualAssets, setManualAssets] = useState<any[]>([
    { hostname: 'dc-01.prod.lan', type: 'SERVER', ipAddress: '192.168.1.10', criticality: 'CRITICAL' }
  ]);

  // Load organization from authenticated session
  useEffect(() => {
    const session = getStoredSession();
    const activeMembership = session?.memberships?.[0];

    if (activeMembership) {
      setOrganization(activeMembership);
      setProfile((p) => ({ ...p, name: activeMembership.organizationName }));
    }
  }, []);

  // When reaching step 4, provision or fetch an ingestion credential for telemetry onboarding
  useEffect(() => {
    if (step === 4 && !credentialToken) {
      provisionCredential();
    }
  }, [step]);

  const provisionCredential = async () => {
    try {
      const existing = await getIngestionCredentials();
      if (existing && existing.length > 0 && existing[0].token) {
        setCredentialToken(existing[0].token);
      } else {
        const created = await createIngestionCredential('Default Ingestion Credential');
        if (created?.token) {
          setCredentialToken(created.token);
        }
      }
    } catch (err) {
      console.error('Failed to auto-provision ingestion credential:', err);
    }
  };

  const handleNext = () => {
    if (step < 4) {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const orgId = organization?.organizationId;
      if (!orgId) {
        throw new Error('Organization ID context is missing.');
      }

      // 1. Update Organization settings
      await apiRequest('/organizations/current', {
        method: 'PATCH',
        body: JSON.stringify({
          size: profile.teamSize,
          industry: profile.industry,
          country: profile.country,
          timeZone: profile.timeZone
        }),
      });

      // 2. Process Asset Onboarding
      if (assetMethod === 'demo') {
        await apiRequest('/organizations/current/seed-demo', {
          method: 'POST',
        });
      } else if (assetMethod === 'manual') {
        for (const asset of manualAssets) {
          if (asset.hostname && asset.hostname.trim()) {
            try {
              await apiRequest('/assets', {
                method: 'POST',
                body: JSON.stringify({
                  hostname: asset.hostname.trim(),
                  displayName: asset.hostname.trim(),
                  type: asset.type || 'SERVER',
                  ipAddress: asset.ipAddress?.trim() || '0.0.0.0',
                  businessCriticality: asset.criticality || 'MEDIUM',
                  environment: 'PROD',
                  isInternetFacing: false,
                }),
              });
            } catch (assetErr) {
              console.warn(`Failed to create asset ${asset.hostname}:`, assetErr);
            }
          }
        }
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const curlCommand = `curl -X POST http://localhost:3001/api/v1/events/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Ingestion-Token: ${credentialToken || '<TOKEN>'}" \\
  -d '{"eventType":"ENDPOINT_ANOMALY","source":"Sysmon","message":"Unauthorized privilege escalation detected","hostname":"${manualAssets[0]?.hostname || 'dc-01.prod.lan'}","severity":"HIGH"}'`;

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
            <Lock className="h-4 w-4" /> Tenant Onboarding
          </div>
        </div>
      </header>

      {/* Steps Indicator */}
      <div className="container mx-auto px-4 max-w-2xl mt-8">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -z-10" />
          {[1, 2, 3, 4].map((num) => (
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
        <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>Organization</span>
          <span>Environment</span>
          <span>Assets</span>
          <span>Telemetry & Launch</span>
        </div>
      </div>

      {/* Main Form Body */}
      <main className="container mx-auto px-4 max-w-2xl my-8 flex-grow">
        <div className="premium-card p-8 rounded-xl border border-slate-800">
          
          {/* Step 1: Org Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="text-cyan-400" /> Step 1: Organization Profile
                </h3>
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
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="text-cyan-400" /> Step 2: Security Environment
                </h3>
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
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="text-cyan-400" /> Step 3: Asset Onboarding
                </h3>
                <p className="text-sm text-slate-400 mt-1">Choose how you want to populate your initial asset catalog</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAssetMethod('demo')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    assetMethod === 'demo' 
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-sm shadow-cyan-500/10' 
                      : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 text-cyan-400 mb-2" />
                  <span className="block font-semibold text-white">Seed Demonstration Catalog</span>
                  <span className="block text-xs text-slate-400 mt-1">Populates realistic servers, workstations, active alerts, and vulnerability exposures.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssetMethod('manual')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    assetMethod === 'manual' 
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-sm shadow-cyan-500/10' 
                      : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                  }`}
                >
                  <Plus className="h-5 w-5 text-cyan-400 mb-2" />
                  <span className="block font-semibold text-white">Register Real Assets Now</span>
                  <span className="block text-xs text-slate-400 mt-1">Enter hostnames and IP addresses of your critical nodes directly.</span>
                </button>
              </div>

              {assetMethod === 'manual' && (
                <div className="space-y-3 mt-4 border-t border-slate-800/80 pt-4">
                  <div className="text-xs font-semibold text-slate-300">Initial Asset List:</div>
                  {manualAssets.map((asset, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Hostname (e.g. srv-core-01)"
                        value={asset.hostname}
                        onChange={(e) => updateManualAsset(idx, 'hostname', e.target.value)}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        value={asset.type}
                        onChange={(e) => updateManualAsset(idx, 'type', e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="SERVER">Server</option>
                        <option value="WORKSTATION">Workstation</option>
                        <option value="DATABASE">Database</option>
                        <option value="NETWORK_DEVICE">Network Device</option>
                      </select>
                      <input
                        type="text"
                        placeholder="IP (e.g. 10.0.1.10)"
                        value={asset.ipAddress}
                        onChange={(e) => updateManualAsset(idx, 'ipAddress', e.target.value)}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        value={asset.criticality}
                        onChange={(e) => updateManualAsset(idx, 'criticality', e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                      {manualAssets.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeManualAsset(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addManualAsset}
                    className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300 mt-2"
                  >
                    <PlusCircle className="h-4 w-4" /> Add another asset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Telemetry & Ingestion Credential */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="text-cyan-400" /> Step 4: Ingestion Credential & Launch
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Your tenant ingestion credential has been provisioned. Send telemetry directly to trigger detection rules.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Tenant Ingestion Token:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(credentialToken)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy Token'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-cyan-300 bg-slate-900/90 p-2.5 rounded border border-slate-800/80 break-all select-all">
                    {credentialToken || 'Generating live credential token...'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Example Ingestion Command (cURL):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(curlCommand)}
                      className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-normal"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy cURL
                    </button>
                  </label>
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {curlCommand}
                  </pre>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-xs text-cyan-300 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    When telemetry is received, ThreatSync OS will normalize the event, match detection rules, correlate incidents, and dynamically recalculate asset risk scores.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex justify-between items-center border-t border-slate-800 pt-6 mt-8">
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
              ) : step === 4 ? (
                <>Launch SOC Workspace <CheckCircle2 className="h-4 w-4" /></>
              ) : (
                <>Next Step <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#030712] py-4 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} ThreatSync OS. Secure operational workspace onboarding.
      </footer>
    </div>
  );
}
