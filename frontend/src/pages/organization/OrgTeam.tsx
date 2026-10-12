import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Shield,
  X,
  Check,
  CheckCircle2,
  XCircle,
  Briefcase,
  ExternalLink,
  Phone,
  Power,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export interface TeamMemberItem {
  id: string;
  _id?: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  assignedCasesCount: number;
  avatar?: string;
  initials?: string;
  isCurrentUser?: boolean;
}

export const OrgTeam: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!user?.organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/organizations/${user.organizationId}/members`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: TeamMemberItem[] = json.data.map((m: any, idx: number) => ({
            id: m._id || m.id || `mem-${idx}`,
            _id: m._id || m.id,
            name: m.name,
            role: m.role === 'ORGANIZATION_ADMIN' ? 'Admin' : 'Agent',
            email: m.email,
            phone: m.phone || '',
            isActive: m.isActive !== undefined ? Boolean(m.isActive) : true,
            status: m.isActive !== false ? 'ACTIVE' : 'INACTIVE',
            assignedCasesCount: typeof m.assignedCasesCount === 'number' ? m.assignedCasesCount : 0,
            initials: m.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2),
            isCurrentUser: user?._id === (m._id || m.id) || user?.email === m.email,
          }));
          setMembers(mapped);
        }
      }
    } catch (err) {
      console.warn('Error loading team members from API', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Toggle member Active / Inactive status
  const handleToggleStatus = async (member: TeamMemberItem) => {
    const newStatus = !member.isActive;
    try {
      const res = await fetch(
        `/api/v1/organizations/${user?.organizationId}/members/${member.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ isActive: newStatus }),
        }
      );

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? { ...m, isActive: newStatus, status: newStatus ? 'ACTIVE' : 'INACTIVE' }
              : m
          )
        );
        setToast(`${member.name} is now ${newStatus ? 'Active' : 'Inactive'}.`);
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
    setOpenMenuId(null);
  };

  // Toggle role (Admin / Agent)
  const handleToggleRole = async (member: TeamMemberItem) => {
    const newRole = member.role === 'Admin' ? 'ORGANIZATION_AGENT' : 'ORGANIZATION_ADMIN';
    try {
      const res = await fetch(
        `/api/v1/organizations/${user?.organizationId}/members/${member.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? { ...m, role: newRole === 'ORGANIZATION_ADMIN' ? 'Admin' : 'Agent' }
              : m
          )
        );
        setToast(`Role updated for ${member.name}.`);
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update role', err);
    }
    setOpenMenuId(null);
  };

  // Remove member
  const handleRemove = async (memberId: string, memberName: string) => {
    try {
      await fetch(`/api/v1/organizations/${user?.organizationId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setToast(`${memberName} removed from the team.`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Failed to remove member', err);
    }
    setOpenMenuId(null);
  };

  const activeCount = members.filter((m) => m.isActive).length;
  const inactiveCount = members.filter((m) => !m.isActive).length;

  const filteredMembers = members.filter((m) => {
    if (activeTab === 'active' && !m.isActive) return false;
    if (activeTab === 'inactive' && m.isActive) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-20 select-none font-sans text-slate-800 relative min-h-[85vh]">
      
      {/* 1. Header: Back Arrow + Title + CTA */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/organization/dashboard')}
            aria-label="Back to dashboard"
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              Team & Staff Management
            </h1>
            <p className="text-xs text-slate-500">
              Manage member roles, active/inactive statuses, and case assignments
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/organization/team/new')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add Member</span>
        </button>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} aria-label="Dismiss toast" className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Filter Tabs: All Members | Active | Inactive */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Members ({members.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active ({activeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inactive')}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'inactive'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Inactive ({inactiveCount})</span>
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search team members by name, email, or role..."
          aria-label="Search team members by name, email, or role"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-normal"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* 4. Team Members List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading team roster...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700">No team members found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add team members to assign cases, triage incoming citizen requests, and resolve grievances.
            </p>
            <button
              type="button"
              onClick={() => navigate('/organization/team/new')}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              + Add New Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className={`p-4 bg-white rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                  member.isActive ? 'border-slate-200/80 hover:border-blue-300' : 'border-slate-200/50 bg-slate-50/50 opacity-80'
                }`}
              >
                {/* Top Row: Avatar + Name + Role & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                      member.isActive ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {member.initials || 'TM'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-[#1E293B] truncate">
                          {member.name}
                        </span>
                        {member.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {member.role}
                        </span>
                        <span>•</span>
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(member)}
                    title="Click to toggle Active / Inactive"
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                      member.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Power className={`w-3 h-3 ${member.isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{member.isActive ? 'Active' : 'Inactive'}</span>
                  </button>
                </div>

                {/* Middle Info Row: Workload Counter + Assigned Cases Link */}
                <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-slate-600 font-medium">Workload:</span>
                    <span className={`font-bold ${member.assignedCasesCount > 0 ? 'text-blue-700' : 'text-slate-500'}`}>
                      {member.assignedCasesCount} active case{member.assignedCasesCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/organization/requests?search=${encodeURIComponent(member.name)}`)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Work</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    {member.phone && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {member.phone}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      aria-label={`Options for ${member.name}`}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === member.id && (
                      <div className="absolute right-0 bottom-7 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 space-y-0.5 text-xs font-semibold text-slate-700">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Power className="w-3.5 h-3.5 text-slate-600" />
                          <span>{member.isActive ? 'Set as Inactive' : 'Set as Active'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleRole(member)}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          <span>Make {member.role === 'Admin' ? 'Agent' : 'Admin'}</span>
                        </button>

                        {!member.isCurrentUser && (
                          <button
                            type="button"
                            onClick={() => handleRemove(member.id, member.name)}
                            className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove from Team</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
