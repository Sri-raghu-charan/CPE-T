import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Menu,
  CheckCircle2,
  Clock,
  ChevronDown,
  Building2,
  LayoutDashboard,
  Sliders,
  Settings,
  X,
  Users,
  Inbox,
  LogOut,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [timeRange] = useState('Real-time');
  const [showDrawer, setShowDrawer] = useState(false);
  const [metrics, setMetrics] = useState({
    totalOrganizations: 0,
    totalRequests: 0,
    resolvedCases: 0,
    pendingCases: 0,
    publishedForms: 0,
  });
  const [orgsList, setOrgsList] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadAdminData() {
      try {
        const token = localStorage.getItem('cpet_access_token');
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [orgsRes, formsRes, caseMetricsRes] = await Promise.all([
          fetch('/api/v1/organizations', { headers }),
          fetch('/api/v1/forms/public'),
          fetch('/api/v1/cases/admin/metrics', { headers }),
        ]);

        let orgCount = 0;
        if (orgsRes.ok) {
          const json = await orgsRes.json();
          if (json.data && Array.isArray(json.data)) {
            orgCount = json.data.length;
            setOrgsList(json.data.slice(0, 5));
          }
        }

        let formCount = 0;
        let formSubmissions = 0;
        if (formsRes.ok) {
          const json = await formsRes.json();
          if (json.data && Array.isArray(json.data)) {
            formCount = json.data.length;
            formSubmissions = json.data.reduce((acc: number, f: any) => acc + (f.submissionCount || 0), 0);
          }
        }

        let totalCases = 0;
        let resolvedCount = 0;
        let pendingCount = 0;

        if (caseMetricsRes.ok) {
          const json = await caseMetricsRes.json();
          if (json.data) {
            totalCases = json.data.totalCases || 0;
            resolvedCount = json.data.resolvedCases || 0;
            pendingCount = (json.data.pendingCases || 0) + (json.data.inProgressCases || 0) + (json.data.escalatedCases || 0);
          }
        }

        // Total requests combines all registered universal cases and online form submissions
        const totalRequests = totalCases + formSubmissions;
        const totalPending = pendingCount > 0 ? pendingCount : (totalRequests - resolvedCount);

        setMetrics({
          totalOrganizations: orgCount,
          totalRequests: totalRequests,
          resolvedCases: resolvedCount,
          pendingCases: Math.max(0, totalPending),
          publishedForms: formCount,
        });
      } catch (err) {
        console.warn('Error loading admin live stats', err);
      }
    }

    loadAdminData();
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <div className="w-full max-w-md md:max-w-4xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Top Header: Hamburger Menu + CPET Logo + Admin Avatar (Matching Screen 3) */}
      <div className="flex items-center justify-between pt-1">
        
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowDrawer(!showDrawer)}
            aria-label="Toggle navigation menu"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[2px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" className="opacity-20" />
                  <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                  <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
                </svg>
              </div>
            </div>
            <span className="font-black text-xl text-[#1E293B] tracking-tight">
              CPET
            </span>
          </div>
        </div>

        {/* Right: Admin User Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#1A56DB] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-blue-600">
            AD
          </div>
        </div>
      </div>

      {/* Hamburger Mobile Drawer / Modal */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full shadow-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    C
                  </div>
                  <span className="font-black text-slate-900">Admin Control</span>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  aria-label="Close navigation menu"
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                <button
                  onClick={() => { setShowDrawer(false); navigate('/admin/dashboard'); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl font-bold text-xs bg-blue-50 text-blue-600"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => { setShowDrawer(false); navigate('/admin/organizations'); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Organizations Directory</span>
                </button>

                <button
                  onClick={() => { setShowDrawer(false); navigate('/admin/services'); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Services & SLA</span>
                </button>

                <button
                  onClick={() => { setShowDrawer(false); navigate('/admin/settings'); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings & SMS Gateway</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
          <div className="flex-1" onClick={() => setShowDrawer(false)} />
        </div>
      )}

      {/* 2. Admin Dashboard Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          System overview and key metrics
        </p>
      </div>

      {/* 3. 4 Key Metric Cards (2x2 Grid matching Screen 3) */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Card 1: Total Organizations */}
        <div
          onClick={() => navigate('/admin/organizations')}
          className="bg-[#EEF5FF] border border-blue-100/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:scale-[1.01] transition-transform cursor-pointer"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-600 leading-tight">
              Total Organizations
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {metrics.totalOrganizations}
          </div>
        </div>

        {/* Card 2: Total Requests */}
        <div
          onClick={() => navigate('/admin/services')}
          className="bg-[#EDFAF8] border border-teal-100/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:scale-[1.01] transition-transform cursor-pointer"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-2">
              <Inbox className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-600 leading-tight">
              Total Requests
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {metrics.totalRequests}
          </div>
        </div>

        {/* Card 3: Resolved Cases */}
        <div className="bg-[#EDFDF5] border border-emerald-100/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:scale-[1.01] transition-transform">
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-600 leading-tight">
              Resolved Cases
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {metrics.resolvedCases}
          </div>
        </div>

        {/* Card 4: Pending Cases */}
        <div className="bg-[#FFF9EE] border border-amber-100/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:scale-[1.01] transition-transform">
          <div>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-600 leading-tight">
              Pending Cases
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {metrics.pendingCases}
          </div>
        </div>

      </div>

      {/* 4. Request Trend Line Chart Card (Exact chart from Screen 3) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1E293B]">
            Request Trend
          </h2>

          {/* Time Range Dropdown */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
            <span>{timeRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Chart SVG Canvas */}
        <div className="w-full pt-1">
          <svg viewBox="0 0 350 160" className="w-full h-44 overflow-visible">
            {/* Horizontal Grid lines */}
            <g stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3">
              <line x1="30" y1="20" x2="340" y2="20" />
              <line x1="30" y1="60" x2="340" y2="60" />
              <line x1="30" y1="100" x2="340" y2="100" />
              <line x1="30" y1="135" x2="340" y2="135" />
            </g>

            {/* Y-Axis Labels */}
            <text x="5" y="24" className="text-[9px] fill-slate-400 font-mono">300</text>
            <text x="5" y="64" className="text-[9px] fill-slate-400 font-mono">200</text>
            <text x="5" y="104" className="text-[9px] fill-slate-400 font-mono">100</text>
            <text x="15" y="138" className="text-[9px] fill-slate-400 font-mono">0</text>

            {/* Gradient Fill under the trend line */}
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Path */}
            <path
              d="M45,110 C70,85 100,85 120,90 C150,95 160,115 170,115 C190,115 205,70 220,65 C250,55 260,40 270,40 C290,40 310,35 325,30 L325,135 L45,135 Z"
              fill="url(#trendGradient)"
            />

            {/* Main Trend Curved Line */}
            <path
              d="M45,110 C70,85 100,85 120,90 C150,95 160,115 170,115 C190,115 205,70 220,65 C250,55 260,40 270,40 C290,40 310,35 325,30"
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Point Markers */}
            <circle cx="45" cy="110" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="120" cy="90" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="170" cy="115" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="220" cy="65" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="270" cy="40" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="325" cy="30" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />

            {/* X-Axis Date Labels */}
            <text x="35" y="152" className="text-[9px] fill-slate-400">Apr 10</text>
            <text x="80" y="152" className="text-[9px] fill-slate-400">Apr 11</text>
            <text x="130" y="152" className="text-[9px] fill-slate-400">Apr 12</text>
            <text x="175" y="152" className="text-[9px] fill-slate-400">Apr 13</text>
            <text x="225" y="152" className="text-[9px] fill-slate-400">Apr 14</text>
            <text x="275" y="152" className="text-[9px] fill-slate-400">Apr 15</text>
            <text x="315" y="152" className="text-[9px] fill-slate-400">Apr 16</text>
          </svg>
        </div>
      </div>

      {/* 5. Recent Organizations Section (Matching Screen 3) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1E293B]">
            Recent Organizations
          </h2>
          <button
            type="button"
            onClick={() => navigate('/admin/organizations')}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        <div className="space-y-2.5">
          {orgsList.length > 0 ? (
            orgsList.map((org) => {
              return (
                <div
                  key={org._id || org.id}
                  onClick={() => navigate(`/admin/organizations/${org._id || org.id}`)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-black text-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1E293B] tracking-tight truncate">
                        {org.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                        {org.category || org.type || 'Verified Authority'}
                      </div>
                    </div>
                  </div>

                  <div className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                    Active
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No registered organizations found.
            </div>
          )}
        </div>
      </div>

      {/* 6. Bottom Navigation Bar (Matching Screen 3) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around z-30 shadow-lg md:hidden">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[#2563EB] font-bold cursor-pointer relative scale-105"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Dashboard</span>
          <span className="absolute -bottom-1 w-3 h-0.5 bg-[#2563EB] rounded-full" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/organizations')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Organizations</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/services')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Services</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Settings</span>
        </button>
      </nav>

    </div>
  );
};
