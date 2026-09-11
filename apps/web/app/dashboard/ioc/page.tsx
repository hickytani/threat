'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShieldAlert, Activity, Database, Globe } from 'lucide-react';

import { apiRequest, getActiveMembership } from '@/lib/api-client';

interface IocRow {
  id: string;
  value: string;
  type: string;
  label: string;
  reputationScore?: number;
  country?: string;
  asn?: string;
  detectionCount?: number;
  associatedDomains?: string[];
  associatedFiles?: string[];
  lastObserved?: string;
}

export default function IocRegistryPage() {
  const [loading, setLoading] = useState(true);
  const [iocs, setIocs] = useState<IocRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchIocs();
  }, []);

  const fetchIocs = async () => {
    setLoading(true);

    try {
      const membership = getActiveMembership();
      if (!membership) {
        setIocs([]);
        return;
      }

      const data = await apiRequest<IocRow[]>('/intelligence/iocs');
      setIocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setIocs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredIocs = useMemo(() => {
    if (!search.trim()) return iocs;

    const query = search.toLowerCase();
    return iocs.filter((ioc) =>
      [ioc.value, ioc.type, ioc.label, ioc.country, ioc.asn]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [iocs, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-cyan-400" /> IOC Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organization-scoped indicators of compromise captured from local intelligence caches and external enrichment snapshots.
          </p>
        </div>

        <button
          onClick={fetchIocs}
          className="text-xs font-semibold p-1.5 rounded border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <Activity className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 rounded-lg bg-[#0b0f19] border border-slate-900">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search IOC value, type, label, ASN or country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono">
          <Database className="h-6 w-6 animate-spin mx-auto text-cyan-400 mb-2" /> Loading IOC inventory...
        </div>
      ) : filteredIocs.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-mono">No IOCs are currently tracked for this tenant.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {filteredIocs.map((ioc) => (
            <Link
              key={ioc.id}
              href={`/dashboard/ioc/${ioc.id}`}
              className="premium-card p-5 rounded-lg border border-slate-900 space-y-4 hover:border-cyan-500/50 transition-colors block"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">{ioc.type}</div>
                  <h3 className="mt-2 font-bold text-sm text-white break-all hover:text-cyan-300">{ioc.value}</h3>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-[3px] text-[8px] font-bold border ${
                    ioc.label === 'MALICIOUS'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : ioc.label === 'SUSPICIOUS'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : ioc.label === 'BENIGN'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {ioc.label}
                </span>
              </div>

              <div className="rounded bg-slate-950/50 border border-slate-900 p-3 text-[10px] font-mono text-slate-400 space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span>Score</span>
                  <span className="text-cyan-400 font-bold">{Math.round(ioc.reputationScore ?? 0)}/100</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Detections</span>
                  <span className="text-white">{ioc.detectionCount ?? 0}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Country</span>
                  <span className="text-white">{ioc.country || 'Unknown'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>ASN</span>
                  <span className="text-white break-all">{ioc.asn || 'N/A'}</span>
                </div>
              </div>

              {(ioc.associatedDomains?.length || ioc.associatedFiles?.length) && (
                <div className="space-y-2">
                  {ioc.associatedDomains?.length ? (
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 mb-1">Associated domains</div>
                      <div className="flex flex-wrap gap-1">
                        {ioc.associatedDomains.slice(0, 4).map((domain) => (
                          <span key={domain} className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[9px] text-slate-300">
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {ioc.associatedFiles?.length ? (
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 mb-1">Associated files</div>
                      <div className="flex flex-wrap gap-1">
                        {ioc.associatedFiles.slice(0, 4).map((file) => (
                          <span key={file} className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[9px] text-slate-300">
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-900 pt-3 text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {ioc.country || 'Unknown'}</span>
                <span>{ioc.lastObserved ? new Date(ioc.lastObserved).toLocaleDateString() : 'Unobserved'}</span>
              </div>
            </Link>
          ))}
        </div>

      )}
    </div>
  );
}
