'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  ShieldAlert, 
  Activity, 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Crosshair,
  Radio,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { getDashboardActivity, ApiClientError } from '../lib/api-client';

interface ThreatEvent {
  id: string;
  eventType: string;
  sourceIp: string;
  target: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  timestamp: string;
  riskScore: number;
}

export default function InteractiveThreatRadar() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(null);
  const [radarAngle, setRadarAngle] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const eventListRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Fetch real security activity from backend API via polling
  useEffect(() => {
    let controller: AbortController | null = null;
    let isMounted = true;

    const fetchActivity = async () => {
      controller = new AbortController();
      try {
        const data = await getDashboardActivity(controller.signal);
        if (!isMounted) return;

        const mapped: ThreatEvent[] = (data || []).map((item: any) => ({
          id: item.id ? `EVT-${item.id.slice(-6).toUpperCase()}` : 'EVT-LOG',
          eventType: item.eventType || item.message || 'Telemetry Event',
          sourceIp: item.sourceIp || '10.0.1.50',
          target: item.target || 'Server Host',
          severity: item.severity || 'LOW',
          timestamp: item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recent',
          riskScore: Math.min(99, Math.max(10, Math.round(item.riskScore || 35))),
        }));

        setEvents(mapped);
        if (mapped.length > 0 && !selectedEvent) {
          setSelectedEvent(mapped[0]);
        }
        setError(null);
        setLastUpdated(new Date());
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!isMounted) return;
        console.warn('Failed to fetch radar telemetry:', err);
        setError('Activity stream offline / Authentication required');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActivity();
    const pollInterval = setInterval(fetchActivity, 5000);

    return () => {
      isMounted = false;
      if (controller) controller.abort();
      clearInterval(pollInterval);
    };
  }, []);

  const handleSelectEvent = (evt: ThreatEvent) => {
    setSelectedEvent(evt);
    if (detailPanelRef.current) {
      gsap.fromTo(
        detailPanelRef.current,
        { scale: 0.97, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }
      );
    }
  };

  // Compute deterministic coordinates for radar blips based on event ID hash
  const getBlipPosition = (id: string, index: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const angle = Math.abs(hash % 360);
    const radiusPct = 25 + Math.abs((hash >> 4) % 55); // 25% to 80% radius
    const rad = (angle * Math.PI) / 180;

    const x = 50 + (radiusPct / 2) * Math.cos(rad);
    const y = 50 + (radiusPct / 2) * Math.sin(rad);

    return { top: `${y}%`, left: `${x}%` };
  };

  return (
    <div className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950/80 backdrop-blur-2xl p-6 shadow-2xl shadow-cyan-950/30 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Radio className="h-5 w-5 animate-pulse text-cyan-400" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wider text-white flex items-center gap-2">
              SECURITY TELEMETRY RADAR <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">POLLING LIVE STREAM</span>
            </h3>
            <p className="text-xs text-slate-400">PostgreSQL Log Processing & Deterministic Event Pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Pipeline: <strong className="text-emerald-400">ACTIVE</strong></span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <RefreshCw className="h-3 w-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Grid Content: Radar Sweep + Real Event Stream + Event Detail */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Visual Radar Display */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 relative">
          <div className="relative w-56 h-56 rounded-full border border-cyan-500/30 flex items-center justify-center overflow-hidden bg-slate-950/90 shadow-inner">
            {/* Concentric radar rings */}
            <div className="absolute w-44 h-44 rounded-full border border-cyan-500/20" />
            <div className="absolute w-32 h-32 rounded-full border border-cyan-500/20" />
            <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20" />
            <div className="absolute w-full h-px bg-cyan-500/20" />
            <div className="absolute h-full w-px bg-cyan-500/20" />

            {/* Rotating radar sweep beam */}
            <div
              className="absolute top-1/2 left-1/2 w-28 h-28 origin-top-left pointer-events-none"
              style={{
                transform: `rotate(${radarAngle}deg)`,
                background: 'conic-gradient(from 0deg at 0% 0%, rgba(34,211,238,0.4) 0deg, transparent 60deg)',
              }}
            />

            {/* Deterministic Radar Blips from Real Events */}
            {events.slice(0, 5).map((evt, idx) => {
              const pos = getBlipPosition(evt.id, idx);
              const isHigh = evt.severity === 'CRITICAL' || evt.severity === 'HIGH';
              return (
                <div
                  key={evt.id}
                  className={`absolute h-2.5 w-2.5 rounded-full ${isHigh ? 'bg-rose-500 border border-white animate-pulse' : 'bg-cyan-400'}`}
                  style={pos}
                  title={`${evt.eventType} (${evt.sourceIp})`}
                />
              );
            })}

            {/* Center target crosshair */}
            <Crosshair className="h-6 w-6 text-cyan-400 opacity-60 z-10" />
          </div>

          <div className="mt-4 text-center">
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest block font-semibold">
              REAL DATABASE EVENT STREAM
            </span>
            <span className="text-xs text-slate-400 mt-1 block font-mono">
              {events.length} Telemetry Record{events.length === 1 ? '' : 's'} Processed
            </span>
          </div>
        </div>

        {/* Real Stream List */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between">
            <span>DATABASE ACTIVITY FEED</span>
            <span className="text-cyan-400">SELECT TO INSPECT</span>
          </div>

          {loading && events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Fetching real telemetry records...
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 font-mono">
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
              No telemetry events recorded yet. Send your first event via ingestion API or curl.
            </div>
          ) : (
            <div ref={eventListRef} className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
              {events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50 scale-[1.02]'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          evt.severity === 'CRITICAL'
                            ? 'bg-rose-500 animate-pulse'
                            : evt.severity === 'HIGH'
                            ? 'bg-amber-500'
                            : 'bg-cyan-400'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                          {evt.id}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              evt.severity === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : evt.severity === 'HIGH'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            }`}
                          >
                            {evt.severity}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5 truncate max-w-[180px]">
                          {evt.eventType}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-cyan-400">{evt.riskScore}/100</div>
                      <div className="text-[10px] text-slate-500">{evt.timestamp}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Event Detail Panel */}
        <div ref={detailPanelRef} className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          {selectedEvent ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-cyan-400" /> EVENT DEEP DIVE
                </span>
                <span className="text-xs font-mono text-slate-400">{selectedEvent.id}</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Threat Event Type</span>
                  <span className="text-white font-bold text-sm">{selectedEvent.eventType}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">SOURCE IP</span>
                    <span className="text-cyan-400 font-bold">{selectedEvent.sourceIp}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">TARGET ASSET</span>
                    <span className="text-indigo-400 font-bold truncate block">{selectedEvent.target}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Risk Score Impact</span>
                    <span className="font-bold text-cyan-400">{selectedEvent.riskScore} / 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 transition-all duration-500"
                      style={{ width: `${selectedEvent.riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-500 font-mono">
              Select an activity log item to inspect deep-dive record context.
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="h-3 w-3 text-cyan-400" /> Audited in Postgres DB
            </span>
            <a
              href="/dashboard/events"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
            >
              Event Explorer <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
