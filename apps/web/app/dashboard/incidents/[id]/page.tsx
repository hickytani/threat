'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Terminal, 
  Clock, 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  BrainCircuit, 
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Plus,
  Play,
  FileCode,
  ShieldCheck
} from 'lucide-react';

export default function IncidentCommandCenter() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Input states
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // Post-Incident Review Fields
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [updatingPir, setUpdatingPir] = useState(false);

  // AI advisory
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  const fetchIncidentDetails = async () => {
    setLoading(true);
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}`, {
        headers: { 'x-organization-id': orgId }
      });
      const data = await res.json();
      if (res.ok) {
        setIncident(data);
        setRootCause(data.rootCause || '');
        setResolution(data.resolution || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchIncidentDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({
          content: newComment,
          isInternalOnly: isInternalComment
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchIncidentDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: 'MEDIUM'
        })
      });

      if (res.ok) {
        setNewTaskTitle('');
        fetchIncidentDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchIncidentDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePir = async () => {
    setUpdatingPir(true);
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ rootCause, resolution })
      });
      if (res.ok) {
        alert('Incident review details saved successfully!');
        fetchIncidentDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingPir(false);
    }
  };

  const handleTriggerAI = () => {
    setAiLoading(true);
    setAiReport(null);

    setTimeout(() => {
      setAiReport(
        `### Incident AI Advisory Summary\n\n` +
        `**Attacker Vector:** Credential reuse leading to lateral movement across server targets.\n` +
        `**Playbook Analysis:**\n` +
        `- 3/4 tasks completed. Remaining step: Confirm Citrix netscaler patching has executed.\n` +
        `- Log audits confirm zero database reads post-block execution. Risk level is contained.\n` +
        `- Recommended Status transition: RESOLVED.\n\n` +
        `*AI-generated summary. Verify audit tokens before closing ticket.*`
      );
      setAiLoading(false);
    }, 1500);
  };

  const handleUploadEvidence = async () => {
    try {
      const savedOrg = localStorage.getItem('memberships');
      if (!savedOrg) return;
      const org = JSON.parse(savedOrg)[0];
      const orgId = org.organizationId;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

      const res = await fetch(`${apiUrl}/incidents/${incidentId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({
          fileName: 'firewall_block_audit_log.txt',
          fileSize: 1024,
          mimeType: 'text/plain'
        })
      });

      if (res.ok) {
        alert('Mock evidence file logged in checklist.');
        fetchIncidentDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 font-mono">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" /> Loading Incident Command Center...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6 text-center text-slate-400">
        <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-2" /> Incident ticket not found or deleted.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Back link */}
      <div>
        <button 
          onClick={() => router.push('/dashboard/incidents')}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to logs list
        </button>
      </div>

      {/* Incident Header */}
      <div className="premium-card p-5 rounded-lg border border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-[3px] text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
              {incident.severity}
            </span>
            <span className="text-[10px] text-slate-500 font-mono uppercase">{incident.incidentType}</span>
          </div>
          <h2 className="text-lg font-bold text-white leading-tight">{incident.title}</h2>
          <p className="text-xs text-slate-400">{incident.summary}</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={incident.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950 text-xs text-white px-3 py-1.5 focus:outline-none"
          >
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="CONTAINMENT_IN_PROGRESS">Containment In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <div className="text-right text-[10px] text-slate-500 font-mono">
            <div>SLA Countdown</div>
            <div className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
              <Clock className="h-3.5 w-3.5" /> 4h remaining
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-900 pb-px text-xs font-semibold">
        {[
          { id: 'overview', name: 'Overview & PIR', icon: Terminal },
          { id: 'tasks', name: 'Playbook Tasks', icon: CheckSquare },
          { id: 'comments', name: 'Discussion Logs', icon: MessageSquare },
          { id: 'evidence', name: 'Evidence Vault', icon: Paperclip },
          { id: 'ai', name: 'AI Diagnostics', icon: BrainCircuit }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-all ${
              activeTab === t.id 
                ? 'border-cyan-400 text-white bg-slate-950/10' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.name}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="min-h-[300px]">
        
        {/* Tab 1: Overview and Post-Incident Review */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Properties */}
            <div className="premium-card p-5 rounded-lg border border-slate-900 md:col-span-1 space-y-4">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider border-b border-slate-900 pb-2">Properties</h4>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Owner Analyst</span>
                  <div className="text-white mt-0.5 flex items-center gap-1 font-mono font-semibold">
                    <User className="h-3.5 w-3.5" /> {incident.assignedAnalystName || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Priority Level</span>
                  <span className="font-semibold text-rose-400 block mt-0.5">{incident.priority}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Detection Log Date</span>
                  <span className="font-mono text-slate-400 block mt-0.5">{new Date(incident.detectionTime).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Post-Incident Review Form */}
            <div className="premium-card p-5 rounded-lg border border-slate-900 md:col-span-2 space-y-4">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider border-b border-slate-900 pb-2 flex items-center gap-1">
                <ShieldCheck className="h-4.5 w-4.5 text-cyan-400" /> Post-Incident Review (PIR)
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Root Cause Analysis</label>
                  <textarea
                    rows={3}
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    className="block w-full mt-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    placeholder="Enter architectural breakdowns, CVE exposures, or misconfiguration findings..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Resolution Playbook logs</label>
                  <textarea
                    rows={3}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="block w-full mt-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    placeholder="Enter mitigation actions executed, block commands, or system cleanups..."
                  />
                </div>

                <div className="flex justify-end border-t border-slate-900 pt-4">
                  <button
                    onClick={handleSavePir}
                    disabled={updatingPir}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-2 rounded transition-colors shadow-md shadow-cyan-500/10"
                  >
                    {updatingPir ? 'Saving...' : 'Save Review Findings'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Tasks Checklist */}
        {activeTab === 'tasks' && (
          <div className="premium-card p-5 rounded-lg border border-slate-900 space-y-4 max-w-2xl mx-auto">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider border-b border-slate-900 pb-2">Remediation Checklist Tasks</h4>
            
            <div className="space-y-2">
              {incident.tasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No remediation tasks assigned.</div>
              ) : (
                incident.tasks.map((task: any) => (
                  <div key={task.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        onChange={() => handleToggleTask(task.id, task.status)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <span className={`text-xs ${task.status === 'COMPLETED' ? 'line-through text-slate-500 font-medium' : 'text-white font-semibold'}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">{task.priority} Priority</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddTask} className="flex gap-2 border-t border-slate-900 pt-4 mt-6">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Assign new validation action..."
                className="flex-1 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="bg-slate-900 border border-slate-800 hover:border-cyan-400 text-white font-bold text-xs px-4 py-1.5 rounded transition-all"
              >
                Add Action
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Discussion Room */}
        {activeTab === 'comments' && (
          <div className="premium-card p-5 rounded-lg border border-slate-900 space-y-4 max-w-2xl mx-auto">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider border-b border-slate-900 pb-2">Analyst Discussion Logs</h4>
            
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {incident.comments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">No discussions logged yet.</div>
              ) : (
                incident.comments.map((c: any) => (
                  <div key={c.id} className="p-3 bg-slate-950/60 rounded border border-slate-900 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span className="font-bold text-slate-400">{c.authorName}</span>
                      <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-200">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostComment} className="border-t border-slate-900 pt-4 space-y-3">
              <textarea
                required
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Log progress report or analyst comments..."
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded transition-colors shadow-md"
                >
                  Post Logs
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Evidence Vault */}
        {activeTab === 'evidence' && (
          <div className="premium-card p-5 rounded-lg border border-slate-900 space-y-4 max-w-xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">Evidence Artifact Files</h4>
              <button
                onClick={handleUploadEvidence}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
              >
                Log Mock File
              </button>
            </div>

            <div className="space-y-2">
              {incident.evidence.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No evidence artifacts attached.</div>
              ) : (
                incident.evidence.map((ev: any) => (
                  <div key={ev.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4.5 w-4.5 text-slate-400" />
                      <div>
                        <span className="font-semibold text-white block">{ev.fileName}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{ev.mimeType} • {(ev.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-950/15 px-1.5 py-0.5 rounded">
                      {ev.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: AI Diagnostics Copilot */}
        {activeTab === 'ai' && (
          <div className="premium-card p-5 rounded-lg border border-slate-900 space-y-4 max-w-2xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1">
                <BrainCircuit className="h-5 w-5 text-cyan-400" /> AI Incident Playbook Advisor
              </h4>
              <button
                onClick={handleTriggerAI}
                disabled={aiLoading}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded transition-all shadow-md"
              >
                {aiLoading ? 'Analyzing...' : 'Audit via AI'}
              </button>
            </div>

            {aiReport ? (
              <div className="p-4 bg-cyan-950/10 border border-cyan-800/10 rounded font-mono text-xs text-slate-300 space-y-3 whitespace-pre-line leading-relaxed">
                {aiReport}
              </div>
            ) : (
              <div className="p-4 bg-slate-950/30 rounded border border-slate-900 text-center py-10 text-xs text-slate-500">
                Click 'Audit via AI' to request context-aware playbook recommendations.
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
