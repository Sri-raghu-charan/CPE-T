import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../design-system/utils.js';

interface RequestItem {
  id: string;
  referenceNumber: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'New' | 'Submitted' | 'In Progress' | 'Pending' | 'Waiting' | 'Escalated' | 'Resolved';
  date: string;
  assignedTo?: string;
}

type FilterTab = 'All' | 'New' | 'Submitted' | 'In Progress' | 'Waiting' | 'Resolved' | 'Escalated';

export const OrgRequestQueue: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sync tab with URL search params if present
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'new') setActiveTab('New');
      else if (tabParam === 'submitted') setActiveTab('Submitted');
      else if (tabParam === 'inProgress') setActiveTab('In Progress');
      else if (tabParam === 'waiting') setActiveTab('Waiting');
      else if (tabParam === 'escalated') setActiveTab('Escalated');
      else if (tabParam === 'resolved') setActiveTab('Resolved');
    }

    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }

    const assignedParam = searchParams.get('assignedTo');
    if (assignedParam) {
      setAssignedToFilter(assignedParam);
    } else {
      setAssignedToFilter('');
    }
  }, [searchParams]);

  useEffect(() => {
    const orgId = user?.organizationId;
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    async function fetchCases() {
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.set('search', searchQuery);

        const res = await fetch(`/api/v1/cases/organization/${orgId}?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            const mapped: RequestItem[] = json.data.map((c: any) => {
              let statusText: RequestItem['status'] = 'New';
              if (c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED') statusText = 'In Progress';
              else if (c.status === 'SUBMITTED') statusText = 'Submitted';
              else if (c.status === 'WAITING_FOR_USER' || c.status === 'ACKNOWLEDGED') statusText = 'Waiting';
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
                date: `${dateStr}, ${timeStr}`,
                assignedTo: c.assignedAgentName || c.assignedAgentId?.name || (c.assignedAgentId ? 'Assigned' : '—'),
              };
            });

            setRequests(mapped);
          } else {
            setRequests([]);
          }
        }
      } catch (err) {
        console.warn('Error loading organization cases', err);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCases();
  }, [user, token, searchQuery]);

  const filterTabs: FilterTab[] = ['All', 'New', 'Submitted', 'In Progress', 'Waiting', 'Resolved', 'Escalated'];

  const filteredItems = requests.filter((item) => {
    // Filter by Tab
    if (activeTab === 'New' && item.status !== 'New') return false;
    if (activeTab === 'Submitted' && item.status !== 'Submitted') return false;
    if (activeTab === 'In Progress' && item.status !== 'In Progress') return false;
    if (activeTab === 'Waiting' && item.status !== 'Waiting' && item.status !== 'Pending') return false;
    if (activeTab === 'Resolved' && item.status !== 'Resolved') return false;
    if (activeTab === 'Escalated' && item.status !== 'Escalated') return false;

    // Filter by Assigned Officer if URL param set
    if (assignedToFilter) {
      if (!item.assignedTo || !item.assignedTo.toLowerCase().includes(assignedToFilter.toLowerCase())) {
        return false;
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.referenceNumber.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.priority.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearAssignedFilter = () => {
    setAssignedToFilter('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('assignedTo');
    setSearchParams(newParams);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-[#EF4444] font-medium';
      case 'Medium':
        return 'text-[#F59E0B] font-medium';
      case 'Low':
      default:
        return 'text-[#10B981] font-medium';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF5E7] text-[#D97706]">
            In Progress
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#F4EDFD] text-[#8B5CF6]">
            Submitted
          </span>
        );
      case 'Pending':
      case 'Waiting':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF9E7] text-[#D97706]">
            {status}
          </span>
        );
      case 'Escalated':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#FEEFEF] text-[#E11D48]">
            Escalated
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EDFBF3] text-[#10B981]">
            Resolved
          </span>
        );
      case 'New':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF5FF] text-[#2563EB]">
            New
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Top Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search requests, categories, or assigned officers..."
            aria-label="Search requests, categories, or assigned officers"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/80 rounded-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        <button
          type="button"
          className="p-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          title="Filter Options"
          aria-label="Filter Options"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Member Filter Pill */}
      {assignedToFilter && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-2xl text-xs text-blue-900 font-medium">
          <span>Filtering workload for: <strong className="text-blue-700">{assignedToFilter}</strong></span>
          <button
            onClick={clearAssignedFilter}
            className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* 2. Filter Tabs / Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. Requests Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm shadow-blue-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 font-bold">ID</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Priority</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Assigned To</th>
                <th className="py-3 px-4 font-bold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading real-time requests...</span>
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/organization/requests/${req.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-blue-600 group-hover:underline">
                      {req.referenceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {req.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={getPriorityColor(req.priority)}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={req.assignedTo && req.assignedTo !== '—' ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
                        {req.assignedTo || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {req.date}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No requests found matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer (Matching Screen 4: "1-7 of 7 requests" with "< 1 >") */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>
              {filteredItems.length === 0
                ? '0-0 of 0 requests'
                : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
                    currentPage * itemsPerPage,
                    filteredItems.length
                  )} of ${filteredItems.length} requests`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  'w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center',
                  currentPage === pageNum
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
