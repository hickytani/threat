'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Activity, Eye, FileText, CheckCircle2, AlertOctagon, Loader2, ArrowRight } from 'lucide-react';
import { getDashboardPosture, apiRequest, getActiveMembership } from '@/lib/api-client';

export default function ComplianceDashboard() {
  const [posture, setPosture] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComplianceData() {
      try {
        const data = await getDashboardPosture();
        setPosture(data);
      } catch (err) {
        console.error('Failed to load compliance posture:', err);
      } finally {
        setLoading(false);
      }
    }

    loadComplianceData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="text-cyan-400" /> Operational Security Posture & Framework Control Mapping
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Defensible security control coverage calculated directly from PostgreSQL asset inventories, telemetry streams, and incident ledgers.
        </p>
      </div>

      {/* Posture Score Banner */}
      {posture && (
        <div className="p-6 rounded-xl border border-cyan-500/30 bg-slate-900/80 flex flex-col md:flex-row items-center justify-between gap-6 font-mono">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs text-slate-400 uppercase tracking-widest block font-semibold">OVERALL SECURITY POSTURE INDEX</span>
            <div className="text-4xl font-extrabold text-white flex items-center justify-center md:justify-start gap-3">
              <span className="text-cyan-400">{posture.overallScore}%</span>
              <span className="text-xs font-normal px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-sans">
                PostgreSQL Calculated Score
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 space-y-1">
            <div>Last Audit Calculated: <strong className="text-white">{new Date(posture.timestamp).toLocaleTimeString()}</strong></div>
            <div>Evaluated Controls: <strong className="text-cyan-400">{posture.controls?.length || 0} Domain Controls</strong></div>
          </div>
        </div>
      )}

      {/* Advisory Alert */}
      <div className="p-4 rounded border border-cyan-500/25 bg-cyan-950/10 text-xs text-cyan-400 leading-relaxed font-mono">
        <strong>Defensible Posture Mapping Note:</strong> Indicators displayed on this console are derived dynamically from your tenant DB state. They represent mapped operational evidence (e.g. NIST CSF DE.CM, SOC 2 CC6.8) and do not constitute formal third-party audit certifications.
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-2" />
          Calculating operational control posture...
        </div>
      ) : (
        /* Control Cards Grid */
        <div className="grid md:grid-cols-2 gap-4">
          {posture?.controls?.map((ctrl: any) => {
            const isHighScore = ctrl.score >= 80;
            const isMedScore = ctrl.score >= 50 && ctrl.score < 80;

            return (
              <div key={ctrl.id} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3 font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-white">{ctrl.name}</h3>
                    <span className="text-[10px] text-cyan-400 block mt-0.5">{ctrl.frameworkReference}</span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded font-extrabold border ${
                      isHighScore
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : isMedScore
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    {ctrl.score}% COVERAGE
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {ctrl.definition}
                </p>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-500">Underlying Evidence:</span>
                  <span className="text-white font-bold">
                    {ctrl.numerator} / {ctrl.denominator} Entities
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
