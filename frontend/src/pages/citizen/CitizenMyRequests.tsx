import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Tv,
  Zap,
  Droplet,
  Smartphone,
  FileQuestion,
  ChevronRight,
  Landmark,
  GraduationCap,
  ShieldAlert,
  ShoppingBag,
  Heart,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { CaseItem } from '../../types/case.js';
import { cn } from '../../design-system/utils.js';
import { ALL_DOMAINS_DATA } from '../../data/serviceProviders.js';

interface RequestDisplayItem {
  id: string;
  referenceNumber: string;
  title: string;
  category: string;
  domainId?: string;
  organization: string;
  location: string;
  relativeTime: string;
  statusText: string;
  statusVariant: 'progress' | 'pending' | 'resolved' | 'closed';
  type: string;
  phoneAlert: string;
  lastSmsSnippet?: string;
}

export const CitizenMyRequests: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'resolved' | 'closed'>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<RequestDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userPhone = user?.phoneNumber || user?.phone || '+91 94940 12345';

  useEffect(() => {
    async function loadCases() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/v1/cases/my', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          const apiCases: CaseItem[] = json.data || [];

          if (Array.isArray(apiCases)) {
            const mapped: RequestDisplayItem[] = apiCases.map((c, i) => {
              const orgName =
                typeof c.organizationId === 'object' && c.organizationId?.name
                  ? c.organizationId.name
                  : c.organizationName || 'Assigned Organization';

              let statusVariant: 'progress' | 'pending' | 'resolved' | 'closed' = 'progress';
              let statusText = 'In Progress';

              if (c.status === 'RESOLVED') {
                statusVariant = 'resolved';
                statusText = 'Resolved';
              } else if (c.status === 'CLOSED' || c.status === 'CANCELLED') {
                statusVariant = 'closed';
                statusText = 'Closed';
              } else if (c.status === 'WAITING_FOR_USER' || c.status === 'SUBMITTED' || c.status === 'WAITING_FOR_ORGANIZATION') {
                statusVariant = 'pending';
                statusText = 'Pending Action';
              }

              const diffDays = Math.max(0, Math.floor((Date.now() - new Date(c.createdAt || Date.now()).getTime()) / (1000 * 3600 * 24)));
              const timeDisplay = diffDays === 0 ? 'Just now' : `${diffDays}d ago`;

              return {
                id: c._id,
                referenceNumber: c.referenceNumber || `CPET-2026-${44500 + i}`,
                title: c.title || c.category || 'Service Request',
                category: c.category || 'General Service',
                domainId: (c as any).domainId || 'general',
                organization: orgName,
                location: (c.location as any)?.city || 'Rajahmundry',
                relativeTime: timeDisplay,
                statusText,
                statusVariant,
                type: c.type,
                phoneAlert: (c as any).contactPhone || userPhone,
                lastSmsSnippet: `SMS tracking active on ${(c as any).contactPhone || userPhone} for status: ${statusText}`,
              };
            });

            setItems(mapped);
          }
        }
      } catch (err) {
        console.warn('Error loading citizen cases', err);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadCases();
  }, [token, userPhone]);

  // Tab counts
  const totalCount = items.length;
  const activeCount = items.filter((i) => i.statusVariant === 'progress').length;
  const pendingCount = items.filter((i) => i.statusVariant === 'pending').length;
  const resolvedCount = items.filter((i) => i.statusVariant === 'resolved').length;
  const closedCount = items.filter((i) => i.statusVariant === 'closed').length;

  // Filtered list based on tab, domain filter, and search text
  const filteredItems = items.filter((item) => {
    // Status tab filter
    if (activeTab === 'active' && item.statusVariant !== 'progress') return false;
    if (activeTab === 'pending' && item.statusVariant !== 'pending') return false;
    if (activeTab === 'resolved' && item.statusVariant !== 'resolved') return false;
    if (activeTab === 'closed' && item.statusVariant !== 'closed') return false;

    // Domain filter
    if (selectedDomain !== 'all') {
      const match =
        (item.domainId && item.domainId === selectedDomain) ||
        item.category.toLowerCase().includes(selectedDomain.toLowerCase()) ||
        item.title.toLowerCase().includes(selectedDomain.toLowerCase());
      if (!match) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        item.referenceNumber.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);
      if (!matchQuery) return false;
    }

    return true;
  });

  const getCategoryIcon = (category: string, type: string) => {
    const lower = (category + ' ' + type).toLowerCase();
    if (lower.includes('ragging') || lower.includes('college') || lower.includes('education')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('cyber') || lower.includes('fraud') || lower.includes('1930') || lower.includes('phishing')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-red-400 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('ac') || lower.includes('appliance') || lower.includes('tv') || lower.includes('refriger')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Tv className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('electric') || lower.includes('power') || lower.includes('apdcl') || lower.includes('discom')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('water') || lower.includes('supply') || lower.includes('drain') || lower.includes('municipal')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Droplet className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('mobile') || lower.includes('internet') || lower.includes('airtel') || lower.includes('jio') || lower.includes('telecom')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('bank') || lower.includes('atm') || lower.includes('sbi') || lower.includes('hdfc') || lower.includes('icici') || lower.includes('card')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('commerce') || lower.includes('amazon') || lower.includes('flipkart') || lower.includes('delivery')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('blood') || lower.includes('health') || lower.includes('hospital')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <FileQuestion className="w-5 h-5" />
      </div>
    );
  };

  const getStatusBadge = (statusText: string, variant: string) => {
    if (variant === 'resolved') {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {statusText}
        </span>
      );
    }
    if (variant === 'pending') {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {statusText}
        </span>
      );
    }
    if (variant === 'closed') {
      return (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {statusText}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
        {statusText}
      </span>
    );
  };

  return (
    <div className="w-full space-y-4 pb-12">
      
      {/* 1. Top Header: Back Arrow + Title + New Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/citizen/home')}
            aria-label="Back to home"
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              My Complaints & Service Requests
            </h1>
            <p className="text-xs text-slate-500">
              Live automated status tracker with real-time phone alerts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/citizen/requests/new')}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>+ New Complaint</span>
        </button>
      </div>

      {/* 2. Automated Phone & SMS Guarantee Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-sm space-y-2 border border-blue-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Automatic SMS Dispatch Active
            </span>
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-blue-800/80 text-[11px] font-mono font-semibold text-blue-200 border border-blue-700 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Alerts Sent to: {userPhone}</span>
          </div>
        </div>
        <p className="text-xs text-blue-100/90 leading-relaxed">
          Whenever an official nodal officer, technician, or regulatory agency updates your case or triggers an escalation, an automated DLT SMS is immediately dispatched to your phone.
        </p>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Case ID (e.g. CPET-2026), provider (SBI, Lloyd, UGC), or issue..."
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
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

      {/* 4. Horizontal Status Tabs Row */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'pb-2 px-3 text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap',
            activeTab === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          All Cases ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={cn(
            'pb-2 px-3 text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap',
            activeTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Active ({activeCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={cn(
            'pb-2 px-3 text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap',
            activeTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Pending Action ({pendingCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resolved')}
          className={cn(
            'pb-2 px-3 text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap',
            activeTab === 'resolved'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Resolved ({resolvedCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('closed')}
          className={cn(
            'pb-2 px-3 text-xs font-bold transition-all cursor-pointer relative whitespace-nowrap',
            activeTab === 'closed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Closed ({closedCount})
        </button>
      </div>

      {/* 5. Domain Category Chips (12 Sectors) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setSelectedDomain('all')}
          className={cn(
            'px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer border',
            selectedDomain === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          All Sectors
        </button>
        {ALL_DOMAINS_DATA.map((dom) => (
          <button
            key={dom.id}
            type="button"
            onClick={() => setSelectedDomain(dom.id === selectedDomain ? 'all' : dom.id)}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5',
              selectedDomain === dom.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            <span>{dom.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* 6. Request Cards Grid */}
      {isLoading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Loading your registered requests...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-700">No complaints matching your criteria</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You can lodge a new official grievance with any of the 12 central sectors in seconds.
          </p>
          <button
            onClick={() => navigate('/citizen/requests/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            File Official Complaint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                navigate(`/citizen/requests/${item.id}`);
              }}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3 cursor-pointer group"
            >
              {/* Top Row: Icon + Case Ref + Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {getCategoryIcon(item.category, item.type)}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 tracking-tight font-mono">
                        {item.referenceNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        • {item.relativeTime}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate">
                      {item.organization} • {item.location}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {getStatusBadge(item.statusText, item.statusVariant)}
                </div>
              </div>

              {/* Bottom SMS Alert Info Box */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] text-slate-600 truncate">
                    {item.lastSmsSnippet || `SMS updates live on ${item.phoneAlert}`}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
