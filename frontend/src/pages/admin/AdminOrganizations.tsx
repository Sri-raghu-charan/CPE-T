import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Droplet,
  Zap,
  Heart,
  Building2,
  Bus,
  Flame,
  GraduationCap,
  ShieldAlert,
  LayoutDashboard,
  Sliders,
  Settings,
} from 'lucide-react';

export interface OrgListItem {
  id: string;
  name: string;
  category: string;
  serviceCount: number;
  status: 'Active' | 'Pending' | 'Suspended';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  location?: string;
  email?: string;
  phone?: string;
  slaDeadline?: string;
}

export const ADMIN_ORGANIZATIONS_DATA: OrgListItem[] = [
  {
    id: 'org-water',
    name: 'Water Supply Department',
    category: 'Water Supply',
    serviceCount: 12,
    status: 'Active',
    icon: Droplet,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    location: 'Rajahmundry, East Godavari',
    email: 'support@wsd.gov.in',
    phone: '+91 88972 44567',
    slaDeadline: '4 hours',
  },
  {
    id: 'org-power',
    name: 'Electricity Board',
    category: 'Electricity',
    serviceCount: 10,
    status: 'Active',
    icon: Zap,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    location: 'Kakinada Central Substation',
    email: 'helpdesk@electricity.gov.in',
    phone: '+91 88972 99881',
    slaDeadline: '6 hours',
  },
  {
    id: 'org-health',
    name: 'Health Department',
    category: 'Healthcare',
    serviceCount: 8,
    status: 'Active',
    icon: Heart,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    location: 'Visakhapatnam District Hospital',
    email: 'nodal@health.gov.in',
    phone: '+91 88972 11223',
    slaDeadline: '2 hours',
  },
  {
    id: 'org-municipal',
    name: 'Municipal Corporation',
    category: 'Municipal Services',
    serviceCount: 6,
    status: 'Active',
    icon: Building2,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    location: 'Municipal HQ, Ward 12',
    email: 'grievance@municipal.gov.in',
    phone: '+91 88972 77889',
    slaDeadline: '12 hours',
  },
  {
    id: 'org-transport',
    name: 'Transport Department',
    category: 'Transport',
    serviceCount: 5,
    status: 'Active',
    icon: Bus,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    location: 'RTO Office Central',
    email: 'complaints@transport.gov.in',
    phone: '+91 88972 33445',
    slaDeadline: '24 hours',
  },
  {
    id: 'org-fire',
    name: 'Fire Services',
    category: 'Emergency',
    serviceCount: 4,
    status: 'Active',
    icon: Flame,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    location: 'Fire Station 1, Main Road',
    email: 'emergency@fire.gov.in',
    phone: '101 / +91 88972 00001',
    slaDeadline: '15 mins',
  },
  {
    id: 'org-antiragging',
    name: 'Anti-Ragging & Higher Education',
    category: 'Education',
    serviceCount: 7,
    status: 'Active',
    icon: GraduationCap,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    location: 'UGC Apex Monitoring Desk',
    email: 'helpline@antiragging.in',
    phone: '1800-180-5522',
    slaDeadline: '12 hours',
  },
  {
    id: 'org-cyber',
    name: 'Cyber Crime Reporting Desk',
    category: 'Cyber & Police',
    serviceCount: 9,
    status: 'Active',
    icon: ShieldAlert,
    iconBg: 'bg-slate-900',
    iconColor: 'text-red-400',
    location: 'National Cyber Crime Cell',
    email: 'incident@cybercrime.gov.in',
    phone: '1930 / +91 88972 91930',
    slaDeadline: '2 hours',
  },
];

export const AdminOrganizations: React.FC = () => {
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<OrgListItem[]>(ADMIN_ORGANIZATIONS_DATA);
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Pending' | 'Suspended'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLiveOrgs() {
      try {
        const token = localStorage.getItem('cpet_access_token');
        const res = await fetch('/api/v1/organizations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            const liveMapped: OrgListItem[] = json.data.map((o: any, idx: number) => ({
              id: o._id || o.id || `live-org-${idx}`,
              name: o.name,
              category: o.category || 'Public Authority',
              serviceCount: (o.services || []).length || 5,
              status: 'Active',
              icon: Building2,
              iconBg: 'bg-blue-100',
              iconColor: 'text-blue-600',
              location: o.address || 'Andhra Pradesh',
              email: o.contactEmail || 'contact@cpet.org',
              phone: o.contactPhone || '+91 94940 12345',
              slaDeadline: `${o.settings?.defaultSlaHours || 48} hours`,
            }));

            setOrganizations((prev) => {
              const names = new Set(liveMapped.map((m) => m.name.toLowerCase()));
              const filteredPrev = prev.filter((p) => !names.has(p.name.toLowerCase()));
              return [...liveMapped, ...filteredPrev];
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch live organizations', err);
      }
    }
    loadLiveOrgs();
  }, []);

  const filteredOrgs = organizations.filter((org) => {
    if (activeTab !== 'All' && org.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        org.name.toLowerCase().includes(q) ||
        org.category.toLowerCase().includes(q) ||
        (org.location && org.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-md md:max-w-4xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Top Header: Back Arrow + Title (Screen 1 Left) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          Organizations
        </h1>
      </div>

      {/* 2. Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search organizations..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Filter Tabs: [ All ] | [ Active ] | [ Pending ] | [ Suspended ] */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {(['All', 'Active', 'Pending', 'Suspended'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. Organizations List Cards (Exact list from Screen 1) */}
      <div className="space-y-2.5">
        {filteredOrgs.map((org) => {
          const Icon = org.icon;
          return (
            <div
              key={org.id}
              onClick={() => navigate(`/admin/organizations/${org.id}`)}
              className="bg-white border border-slate-100 hover:border-blue-200 rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              {/* Left: Icon + Name + Subtitle */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-2xl ${org.iconBg} ${org.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-[#1E293B] group-hover:text-blue-600 transition-colors truncate">
                    {org.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                    {org.category} <span className="text-slate-300">•</span> {org.serviceCount} services
                  </div>
                </div>
              </div>

              {/* Right: Active Badge + Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  {org.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}

        {filteredOrgs.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-2">
            <div className="text-xs font-bold text-slate-500">No organizations found</div>
            <p className="text-[11px] text-slate-400">
              Try adjusting your search query or filter tab.
            </p>
          </div>
        )}
      </div>

      {/* 5. Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around z-30 shadow-lg md:hidden">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/organizations')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[#2563EB] font-bold cursor-pointer relative scale-105"
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Organizations</span>
          <span className="absolute -bottom-1 w-3 h-0.5 bg-[#2563EB] rounded-full" />
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
