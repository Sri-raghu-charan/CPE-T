import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Bell,
  Mic,
  GraduationCap,
  ShieldAlert,
  ShoppingBag,
  Wifi,
  Landmark,
  Building2,
  Zap,
  Heart,
  Plane,
  Home,
  FileCheck,
  Tv,
  ChevronRight,
  ArrowRight,
  FileText,
  ShieldCheck,
  Sparkles,
  Search,
  MessageSquare,
  X,
  Smartphone,
  Layers,
} from 'lucide-react';
import { ALL_DOMAINS_DATA } from '../../data/serviceProviders.js';
import { cn } from '../../design-system/utils.js';

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  ShieldAlert,
  ShoppingBag,
  Wifi,
  Landmark,
  Building2,
  Zap,
  Heart,
  Plane,
  Home,
  FileCheck,
  Tv,
};

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  time: string;
  read: boolean;
  phone: string;
  isSms: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'SMS Dispatched: Case Status Update',
    message: 'CPET Alert: Case CPET-2026-44537 is IN_PROGRESS with Lloyd. Technician Rajesh assigned (ETA 4:30 PM).',
    type: 'SMS',
    time: '10m ago',
    read: false,
    phone: '+91 94940 12345',
    isSms: true,
  },
  {
    id: 'n-2',
    title: 'Nodal Officer Assigned (Banking)',
    message: 'SBI Grievance Cell has acknowledged ATM Dispute #CPET-2026-44890. Reverse audit initiated.',
    type: 'SMS',
    time: '2h ago',
    read: false,
    phone: '+91 94940 12345',
    isSms: true,
  },
  {
    id: 'n-3',
    title: 'Anti-Ragging Squad Deployed',
    message: 'Confidential enquiry opened by UGC National Monitoring Cell for Case #CPET-2026-44912.',
    type: 'SMS',
    time: '1d ago',
    read: true,
    phone: '+91 94940 12345',
    isSms: true,
  },
];

export const CitizenHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real notifications from backend if available
  useEffect(() => {
    async function fetchNotifications() {
      if (!token) return;
      try {
        const res = await fetch('/api/v1/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: NotificationItem[] = json.data.map((n: any) => ({
              id: n._id || n.id,
              title: n.title || 'Official Case Notification',
              message: n.message || n.body || '',
              type: n.channel || 'SMS',
              time: 'Recent',
              read: !!n.read,
              phone: user?.phoneNumber || '+91 94940 12345',
              isSms: true,
            }));
            setNotifications(mapped);
            setUnreadCount(mapped.filter((x) => !x.read).length);
          }
        }
      } catch (e) {
        console.warn('Using default notifications state', e);
      }
    }
    fetchNotifications();
  }, [token, user]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Dynamic greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const userName = user?.name ? user.name.split(' ')[0] : '';
  const userPhone = user?.phoneNumber || user?.phone || '+91 94940 12345';

  const filteredDomains = ALL_DOMAINS_DATA.filter((dom) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      dom.title.toLowerCase().includes(q) ||
      dom.shortLabel.toLowerCase().includes(q) ||
      dom.providers.some((p) => p.name.toLowerCase().includes(q) || p.shortCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-6 pb-16 relative">
      
      {/* 1. Top Header: Greeting + Phone Info + Notification Bell */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E293B] tracking-tight">
            {getGreeting()} {userName || 'Citizen'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 font-normal">
              Official Grievance & Tracking Portal
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-600" />
              SMS Active: {userPhone}
            </span>
          </div>
        </div>

        {/* Bell Notification Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors relative cursor-pointer shrink-0"
            title="Notifications & SMS Updates"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Phone & SMS Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-colors cursor-pointer',
                      n.read ? 'bg-slate-50 border-slate-100' : 'bg-blue-50/50 border-blue-100'
                    )}
                    onClick={() => navigate('/citizen/requests')}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-blue-700 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        DLT SMS Delivered
                      </span>
                      <span>{n.time}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {n.title}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">📱 {userPhone}</span>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/citizen/requests');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>View All Tracker Cases</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Urgent Highlight Action Banners (Responsive 3-Column on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Banner 1: AI Natural Voice & Text Intake */}
        <div
          onClick={() => navigate('/citizen/intake')}
          className="w-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-md shadow-blue-600/15 hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-between gap-3 cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white truncate">AI Voice Intake</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white">AI</span>
              </div>
              <p className="text-[11px] text-blue-100 font-normal truncate mt-0.5">
                Speak or type in any language
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform shrink-0" />
        </div>

        {/* Banner 2: Anti-Ragging & Campus Harassment Desk */}
        <div
          onClick={() => navigate('/citizen/requests/new?domain=antiragging')}
          className="w-full bg-gradient-to-br from-rose-600 to-red-700 text-white rounded-2xl p-4 shadow-md shadow-rose-600/15 hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-between gap-3 cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white truncate">Anti-Ragging Cell</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white">UGC 1800</span>
              </div>
              <p className="text-[11px] text-rose-100 truncate mt-0.5">
                Confidential college grievance
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-200 group-hover:translate-x-1 transition-transform shrink-0" />
        </div>

        {/* Banner 3: Cyber Crime 1930 & Banking Fraud */}
        <div
          onClick={() => navigate('/citizen/requests/new?domain=cybercrime')}
          className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md shadow-slate-900/15 hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-between gap-3 cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white truncate">Cyber Crime & Fraud</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300">1930</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                UPI phishing & account freeze
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </div>

      </div>

      {/* Featured: Public & Organization Forms Directory Card */}
      <div
        onClick={() => navigate('/citizen/forms')}
        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-blue-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group hover:scale-[1.008] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-200">
                Official Forms Hub
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                Public + Organization Forms
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
              Browse & Submit Official Application & Grievance Forms
            </h3>
            <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
              Discover verified forms from municipal utilities, consumer electronics (Lloyd, Samsung), public grid (Apex Power), and Banking Ombudsman.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/citizen/forms');
          }}
          className="px-4 py-2.5 rounded-xl bg-white text-blue-700 text-xs font-black shadow-sm shrink-0 flex items-center gap-1.5 group-hover:bg-blue-50 transition-colors"
        >
          <span>Explore All Forms</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Central Search Bar for Official Directories & Services */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any sector, authority (UGC, RBI, TRAI, DISCOM), or brand (Samsung, SBI, Airtel)..."
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* 4. Comprehensive Multi-Sector Portal Grid (12 Sectors) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#1E293B] tracking-tight">
              All Official Sectors & Service Authorities
            </h2>
            <p className="text-xs text-slate-500">
              Select any official authority to file a registered grievance with automated SMS tracking:
            </p>
          </div>
          <button
            onClick={() => navigate('/citizen/requests/new')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Intake Form</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredDomains.map((domain) => {
            const IconComponent = ICON_MAP[domain.iconName] || FileText;

            return (
              <div
                key={domain.id}
                onClick={() => navigate(`/citizen/requests/new?domain=${domain.id}`)}
                className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-blue-400 hover:bg-blue-50/20 transition-all flex flex-col justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 font-mono">
                    {domain.defaultSlaHours}h SLA
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                    {domain.shortLabel}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-normal leading-tight mt-1 truncate">
                    {domain.providers.map((p) => p.shortCode).slice(0, 3).join(', ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Quick Access Navigation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div
          onClick={() => navigate('/citizen/requests')}
          className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1E293B]">My Complaints</div>
            <div className="text-[10px] text-slate-400 font-normal">Live SMS tracker</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/citizen/blood')}
          className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1E293B]">Blood Hub</div>
            <div className="text-[10px] text-slate-400 font-normal">Find 5-level donors</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/citizen/intake')}
          className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1E293B]">AI Assistant</div>
            <div className="text-[10px] text-slate-400 font-normal">Smart triage & voice</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/citizen/help')}
          className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1E293B]">Help & Hotline</div>
            <div className="text-[10px] text-slate-400 font-normal">1930, UGC, RBI info</div>
          </div>
        </div>

      </div>

      {/* 6. Statutory Enforceability & SMS Guarantee Box */}
      <div className="w-full bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
              Central Automated Resolution Engine
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold mt-1">
            Official Nodal Assignment & Instant Mobile SMS Updates
          </div>
          <div className="text-xs text-slate-300 mt-0.5">
            Every status transition automatically notifies you via SMS and escalates to senior ombudsman if SLA breaches.
          </div>
        </div>
        <button
          onClick={() => navigate('/citizen/requests')}
          className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>Track Live Status</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
