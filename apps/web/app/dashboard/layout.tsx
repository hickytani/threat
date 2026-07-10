'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  Layers, 
  BrainCircuit, 
  Terminal, 
  Activity, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  LogOut, 
  User, 
  Search, 
  Bell, 
  Menu, 
  X,
  Database,
  Workflow
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check credentials locally
    const savedUser = localStorage.getItem('user');
    const savedOrg = localStorage.getItem('memberships');

    if (!savedUser || !savedOrg) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(savedUser));
    const orgs = JSON.parse(savedOrg);
    if (orgs.length > 0) {
      setOrganization(orgs[0]);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      await fetch(`${apiUrl}/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed', err);
    }
    
    localStorage.clear();
    router.push('/login');
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Threat Canvas', href: '/dashboard/explorer', icon: Workflow },
    { name: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
    { name: 'Incidents', href: '/dashboard/incidents', icon: Terminal },
    { name: 'Asset Registry', href: '/dashboard/assets', icon: Layers },
    { name: 'Intelligence Hub', href: '/dashboard/investigate', icon: BrainCircuit },
    { name: 'Vulnerabilities', href: '/dashboard/vulnerabilities', icon: Database },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: FileSpreadsheet },
    { name: 'Compliance Checklist', href: '/dashboard/compliance', icon: Shield },
  ];

  if (!user || !organization) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030712] text-slate-400">
        <Activity className="h-8 w-8 animate-spin text-cyan-400 mr-2" /> Authenticating secure session...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#030712] text-slate-100 overflow-hidden font-sans">
      
      {/* Collapsible Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-[#0b0f19] border-r border-slate-900 flex flex-col justify-between transition-all duration-300 z-35`}
      >
        <div className="flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900 bg-slate-950/20">
            <div className="flex items-center gap-2 overflow-hidden">
              <Shield className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              {sidebarOpen && (
                <span className="font-bold text-sm tracking-wider text-white whitespace-nowrap">
                  THREATSYNC <span className="text-cyan-400">OS</span>
                </span>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-900 hidden md:block"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-cyan-950/20 border-l-2 border-cyan-400 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                  }`}
                  title={item.name}
                >
                  <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (User details) */}
        <div className="p-3 border-t border-slate-900 bg-slate-950/25">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-7 w-7 rounded-full bg-cyan-950 border border-cyan-800/40 flex items-center justify-center text-cyan-400 text-xs font-bold uppercase">
                  {user.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white whitespace-nowrap truncate">{user.fullName}</div>
                  <div className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{organization.role.replace('_', ' ')}</div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-900"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-900 bg-[#090d16] flex items-center justify-between px-6 z-20">
          
          {/* Org Name Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 font-bold uppercase">ACTIVE TENANT</span>
              <span className="text-xs font-semibold text-cyan-400">{organization.organizationName}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> WebSocket: Live Connected
            </div>
          </div>

          {/* Quick Actions Search Header */}
          <div className="flex items-center gap-4">
            <div className="relative max-w-xs hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search IOCs, CVEs, Assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-md border border-slate-800 bg-slate-950/60 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                className="relative p-1.5 rounded border border-slate-800 text-slate-400 hover:text-white bg-slate-950/20"
                title="Telemetry Feeds"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </button>
            </div>
          </div>

        </header>

        {/* Route Pages Container */}
        <main className="flex-1 overflow-y-auto bg-[#030712] relative">
          {children}
        </main>
      </div>

    </div>
  );
}
