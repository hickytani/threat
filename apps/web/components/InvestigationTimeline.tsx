'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TimelineItem } from 'shared-types';
import { SeverityBadge } from './StateViews';
import {
  Activity,
  AlertTriangle,
  FileSpreadsheet,
  BrainCircuit,
  MessageSquare,
  CheckSquare,
  Shield,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export function InvestigationTimeline({ items }: { items: TimelineItem[] }) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center border border-slate-900 rounded bg-slate-950/20 text-xs text-slate-500 font-mono">
        No chronological timeline events recorded.
      </div>
    );
  }

  // Sort items deterministically by timestamp descending (newest first) or ascending
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'SECURITY_EVENT':
        return <Activity className="h-4 w-4 text-cyan-400" />;
      case 'ALERT':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'INCIDENT_TRANSITION':
        return <Shield className="h-4 w-4 text-purple-400" />;
      case 'INTELLIGENCE_ACTIVITY':
        return <BrainCircuit className="h-4 w-4 text-emerald-400" />;
      case 'AUDIT_LOG':
        return <FileSpreadsheet className="h-4 w-4 text-slate-400" />;
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'TASK':
        return <CheckSquare className="h-4 w-4 text-indigo-400" />;
      default:
        return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  const getEntityLink = (item: TimelineItem) => {
    if (!item.referenceId) return null;

    let href = '';
    let label = item.referenceId;

    switch (item.referenceType) {
      case 'ALERT':
        href = `/dashboard/alerts/${item.referenceId}`;
        break;
      case 'INCIDENT':
        href = `/dashboard/incidents/${item.referenceId}`;
        break;
      case 'ASSET':
        href = `/dashboard/assets/${item.referenceId}`;
        break;
      case 'IOC':
        href = `/dashboard/ioc/${item.referenceId}`;
        break;
      case 'SECURITY_EVENT':
        href = `/dashboard/explorer?id=${item.referenceId}`;
        break;
      default:
        break;
    }

    if (!href) return null;

    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-[10px] font-mono text-cyan-400 hover:text-white hover:border-cyan-500 transition-colors ml-2"
      >
        <span>{label}</span>
        <ExternalLink className="h-2.5 w-2.5" />
      </Link>
    );
  };

  return (
    <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
      {sortedItems.map((item, index) => {
        const isExpanded = !!expandedIds[item.id || index];
        const dateStr = new Date(item.timestamp).toLocaleString();

        return (
          <div key={item.id || index} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-[35px] top-0.5 p-1.5 rounded-full bg-[#0b0f19] border border-slate-800 flex items-center justify-center">
              {getItemIcon(item.type)}
            </div>

            {/* Event Card */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase tracking-wider">
                    {item.type.replace('_', ' ')}
                  </span>
                  {item.severity && <SeverityBadge severity={item.severity} />}
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  {getEntityLink(item)}
                </div>

                <div className="text-[11px] font-mono text-slate-500">{dateStr}</div>
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{item.description}</p>

              {/* Source & Metadata drawer */}
              <div className="mt-3 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <div>Source: <span className="text-slate-400 font-semibold">{item.source}</span></div>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <button
                    onClick={() => toggleExpand(item.id || String(index))}
                    className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span>{isExpanded ? 'Hide Evidence JSON' : 'Inspect Evidence JSON'}</span>
                  </button>
                )}
              </div>

              {/* Collapsible Metadata */}
              {isExpanded && item.metadata && (
                <pre className="mt-3 p-3 rounded bg-slate-950 border border-slate-900 text-[10px] font-mono text-cyan-300/90 overflow-x-auto">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
