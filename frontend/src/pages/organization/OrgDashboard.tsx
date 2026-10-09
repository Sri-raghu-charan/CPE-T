import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Inbox,
  Send,
  Clock,
  Hourglass,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Layers,
  PlusCircle,
  MessageSquare,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { cn } from '../../design-system/utils.js';

interface MetricItem {
  key: string;
  label: string;
  count: number;
  bgStyle: string;
  textStyle: string;
  iconBg: string;
  icon: React.ElementType;
}

interface RecentRequestRow {
  id: string;
  referenceNumber: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'New' | 'Submitted' | 'In Progress' | 'Pending' | 'Waiting' | 'Escalated' | 'Resolved';
  createdOn: string;
  assignedTo: string;
}

export const OrgDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [publishedFormsCount, setPublishedFormsCount] = useState<number>(0);
  const [totalSubmissionsCount, setTotalSubmissionsCount] = useState<number>(0);
  const [metrics, setMetrics] = useState({
    new: 0,
    submitted: 0,
    inProgress: 0,
    waiting: 0,
    escalated: 0,
  });

  const [recentRequests, setRecentRequests] = useState<RecentRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) {
        setIsLoading(false);
        return;
      }
      try {
        const [dashRes, casesRes, formsRes] = await Promise.all([
          fetch(`/api/v1/organizations/${user.organizationId}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/cases/organization/${user.organizationId}?limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/v1/forms', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (dashRes.ok) {
          const json = await dashRes.json();
          if (json.data) {
            setMetrics({
              new: typeof json.data.newRequests === 'number' ? json.data.newRequests : 0,
              submitted: typeof json.data.submitted === 'number' ? json.data.submitted : 0,
              inProgress: typeof json.data.inProgress === 'number' ? json.data.inProgress : 0,
              waiting: typeof json.data.waiting === 'number' ? json.data.waiting : 0,
              escalated: typeof json.data.escalated === 'number' ? json.data.escalated : 0,
            });
          }
        }

        if (formsRes.ok) {
          const formsJson = await formsRes.json();
          if (formsJson.data && Array.isArray(formsJson.data)) {
            setPublishedFormsCount(formsJson.data.filter((f: any) => f.isPublished).length);
            const totalSub = formsJson.data.reduce((acc: number, f: any) => acc + (f.submissionCount || 0), 0);
            setTotalSubmissionsCount(totalSub);
          }
        }

        if (casesRes.ok) {
          const json = await casesRes.json();
          if (json.data && Array.isArray(json.data)) {
            const mapped: RecentRequestRow[] = json.data.slice(0, 5).map((c: any) => {
              let statusText: RecentRequestRow['status'] = 'New';
              if (c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED') statusText = 'In Progress';
              else if (c.status === 'SUBMITTED') statusText = 'Submitted';
              else if (c.status === 'WAITING_FOR_USER') statusText = 'Waiting';
              else if (c.status === 'ESCALATED') statusText = 'Escalated';
              else if (c.status === 'RESOLVED' || c.status === 'CLOSED') statusText = 'Resolved';

              const pri: 'High' | 'Medium' | 'Low' =
                c.priority === 'HIGH' || c.priority === 'URGENT' ? 'High' : c.priority === 'MEDIUM' ? 'Medium' : 'Low';

              const d = new Date(c.createdAt || Date.now());
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              return {
                id: c._id,
                referenceNumber: c.referenceNumber || 'CPET-2026-1000',
                category: c.category || 'Service Request',
                priority: pri,
                status: statusText,
                createdOn: `${dateStr}, ${timeStr}`,
                assignedTo: c.assignedAgentName || '—',
              };
            });
            setRecentRequests(mapped);
          } else {
            setRecentRequests([]);
          }
        }
      } catch (err) {
        console.warn('Notice loading dashboard api:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, token]);

  const userName = user?.name || 'Medha Sri Varsha';
  const orgName = user?.organizationName || 'ABC Healthcare Ltd.';
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // 5 Status Cards (Screen 3 in uploaded mockup)
  const statusCards: MetricItem[] = [
    {
      key: 'new',
      label: 'New',
      count: metrics.new,
      bgStyle: 'bg-[#EDF4FE] border-[#DBEAFE]',
      textStyle: 'text-[#1D4ED8]',
      iconBg: 'bg-[#DBEAFE]/80 text-[#2563EB]',
      icon: Inbox,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      count: metrics.submitted,
      bgStyle: 'bg-[#F4EDFD] border-[#E9D5FF]',
      textStyle: 'text-[#7E22CE]',
      iconBg: 'bg-[#E9D5FF]/80 text-[#9333EA]',
      icon: Send,
    },
    {
      key: 'inProgress',
      label: 'In-Progress',
      count: metrics.inProgress,
      bgStyle: 'bg-[#FEF7EA] border-[#FED7AA]',
      textStyle: 'text-[#C2410C]',
      iconBg: 'bg-[#FED7AA]/80 text-[#EA580C]',
      icon: Clock,
    },
    {
      key: 'waiting',
      label: 'Waiting',
      count: metrics.waiting,
      bgStyle: 'bg-[#EDFBF3] border-[#BBF7D0]',
      textStyle: 'text-[#15803D]',
      iconBg: 'bg-[#BBF7D0]/80 text-[#16A34A]',
      icon: Hourglass,
    },
    {
      key: 'escalated',
      label: 'Escalated',
      count: metrics.escalated,
      bgStyle: 'bg-[#FEEFEF] border-[#FECDD3]',
      textStyle: 'text-[#BE123C]',
      iconBg: 'bg-[#FECDD3]/80 text-[#E11D48]',
      icon: AlertTriangle,
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-[#EF4444] font-semibold';
      case 'Medium':
        return 'text-[#F59E0B] font-semibold';
      case 'Low':
      default:
        return 'text-[#10B981] font-semibold';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF5E7] text-[#D97706] border border-[#FDE68A]/60">
            In Progress
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4EDFD] text-[#8B5CF6] border border-[#DDD6FE]/60">
            Submitted
          </span>
        );
      case 'Pending':
      case 'Waiting':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9E7] text-[#D97706] border border-[#FDE68A]/60">
            {status}
          </span>
        );
      case 'Escalated':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEEFEF] text-[#E11D48] border border-[#FECDD3]/60">
            Escalated
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDFBF3] text-[#10B981] border border-[#BBF7D0]/60">
            Resolved
          </span>
        );
      case 'New':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF5FF] text-[#2563EB] border border-[#BFDBFE]/60">
            New
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Greeting Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <div>
          <span className="text-sm font-semibold text-slate-500 block">
            Good Morning,
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E293B] tracking-tight">
            {userName}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {orgName}
          </p>
        </div>

        {/* Date Indicator Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-2xl border border-slate-200/80 text-slate-600 text-xs font-bold shadow-2xs self-start sm:self-auto">
          <span>{formattedDate}</span>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* 2. Metric Status Cards Grid (5 Soft Colored Cards in a row) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              onClick={() => navigate(`/organization/requests?tab=${card.key}`)}
              className={cn(
                'p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]',
                card.bgStyle
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center p-1', card.iconBg)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={cn('text-xs font-bold tracking-tight', card.textStyle)}>
                  {card.label}
                </span>
              </div>

              <div className="mt-3">
                <span className={cn('text-2xl sm:text-3xl font-black tracking-tight leading-none', card.textStyle)}>
                  {card.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2.5 Forms Studio & Two-Way Ingestion Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dynamic Forms Studio Banner */}
        <div className="lg:col-span-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-5 sm:p-6 text-white shadow-md shadow-blue-900/10 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
                Dynamic Intake Studio
              </span>
              <span className="text-blue-200 text-xs font-semibold">•</span>
              <span className="text-blue-100 text-xs font-semibold flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
                {publishedFormsCount} Forms Live & Published
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Create, Publish & Collect Citizen Form Submissions
            </h2>
            <p className="text-xs text-blue-100/90 max-w-2xl leading-relaxed">
              Design tailored intake questionnaires with custom SLA countdowns, attachments, and field validation. Forms are instantly discoverable on the Citizen Portal or accessible via direct public link.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/organization/forms/builder')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 text-xs font-black shadow-sm flex items-center gap-2 hover:bg-blue-50 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>+ Create New Form</span>
            </button>
            <button
              onClick={() => navigate('/organization/forms')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 backdrop-blur-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-blue-200" />
              <span>Manage Forms Studio</span>
            </button>
            <button
              onClick={() => navigate('/organization/requests?type=FORM_SUBMISSION')}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{totalSubmissionsCount} Submissions Received</span>
            </button>
          </div>
        </div>

        {/* Real-time 2-Way Citizen Communication Status */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Two-Way Sync
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Socket.IO Live" />
            </div>
            <h3 className="text-base font-black text-slate-800 mt-1">
              Citizen Communication Hub
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Direct real-time messaging, document requests, and SLA status transitions with citizens.
            </p>
          </div>

          <div className="space-y-2">
            <div
              onClick={() => navigate('/organization/requests?status=WAITING_FOR_USER')}
              className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">Awaiting Citizen Reply</span>
              </div>
              <span className="text-xs font-black text-amber-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                {metrics.waiting}
              </span>
            </div>

            <div
              onClick={() => navigate('/organization/requests?status=IN_PROGRESS')}
              className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900">Active Conversations</span>
              </div>
              <span className="text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                {metrics.inProgress}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Requests Section (Card with Data Table) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm shadow-blue-900/5 p-5 sm:p-6 space-y-4">
        
        {/* Header Row: Title + "View All" */}
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#1E293B] tracking-tight">
            Recent Requests & Form Submissions
          </h2>
          <Link
            to="/organization/requests"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            View All
          </Link>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading real queue data...</span>
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No Registered Issues in Queue</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                When citizens submit requests or fill your published forms, they will appear here in real time.
              </p>
              <button
                onClick={() => navigate('/organization/forms/builder')}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                + Build New Form
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created On</th>
                  <th className="py-3 px-3">Assigned To</th>
                  <th className="py-3 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/organization/requests/${req.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 font-bold text-blue-600 group-hover:underline">
                      {req.referenceNumber}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {req.category}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={getPriorityColor(req.priority)}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-500 whitespace-nowrap">
                      {req.createdOn}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      {req.assignedTo}
                    </td>
                    <td className="py-3.5 px-2 text-right text-slate-400 group-hover:text-blue-600">
                      <ChevronRight className="w-4 h-4 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};
