'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest, getActiveMembership } from '@/lib/api-client';

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    setLoading(true);

    try {
      const membership = getActiveMembership();
      if (!membership) {
        setMembers([]);
        setOrganization(null);
        return;
      }

      setOrganization(membership);
      const data = await apiRequest<any[]>('/organizations/current/members');
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMembers([]);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="text-cyan-400" /> Organization Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Current tenant profile, membership, and access posture for the active organization.
          </p>
        </div>

        <button
          onClick={fetchOrganizationData}
          className="text-xs font-semibold p-1.5 rounded border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono">
          <Users className="h-6 w-6 animate-spin mx-auto text-cyan-400 mb-2" /> Loading organization data...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="premium-card p-5 rounded-lg border border-slate-900">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Tenant</div>
              <div className="mt-3 text-lg font-bold text-white">{organization?.organizationName || 'Unknown tenant'}</div>
            </div>

            <div className="premium-card p-5 rounded-lg border border-slate-900">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Members</div>
              <div className="mt-3 text-lg font-bold text-white">{members.length}</div>
            </div>

            <div className="premium-card p-5 rounded-lg border border-slate-900">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Access</div>
              <div className="mt-3 flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="h-4 w-4" /> Active
              </div>
            </div>
          </div>

          <div className="premium-card p-5 rounded-lg border border-slate-900">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-4">Current members</div>

            {members.length === 0 ? (
              <div className="text-slate-500 text-sm">No members found for this tenant.</div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-950/40 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{member.user?.fullName || member.user?.email || 'Unknown user'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{member.user?.email || 'No email available'}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-[10px] font-bold">
                        {member.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        member.user?.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {member.user?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
