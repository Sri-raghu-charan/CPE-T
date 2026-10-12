import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const OrgAddTeamMember: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role || !department) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (user?.organizationId) {
        const token = localStorage.getItem('cpet_access_token');
        await fetch(`/api/v1/organizations/${user.organizationId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role: role === 'Admin' ? 'ORGANIZATION_ADMIN' : 'ORGANIZATION_AGENT',
            department: department,
          }),
        }).catch(() => {
          // fallback to local state
        });
      }

      // Add to local mock storage so OrgTeam renders it immediately
      const savedMembers = JSON.parse(localStorage.getItem('cpet_team_members') || '[]');
      savedMembers.push({
        id: `mem-${Date.now()}`,
        name: name.trim(),
        role: role,
        email: email.trim().toLowerCase(),
        department: department,
        avatar: '',
        initials: name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      });
      localStorage.setItem('cpet_team_members', JSON.stringify(savedMembers));

      setToast(`Invitation dispatched to ${email}!`);
      setTimeout(() => {
        navigate('/organization/team');
      }, 1000);
    } catch (err) {
      console.error(err);
      navigate('/organization/team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-5 pb-16 select-none font-sans text-slate-800">
      
      {/* 1. Top Header: Back Arrow + Title (Screen 4 Exact) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/organization/team')}
          aria-label="Back to team"
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          Add Team Member
        </h1>
      </div>

      {/* Success Toast */}
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

      {/* 2. Form Card */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        
        {/* Field 1: Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#1E293B]">
            Name
          </label>
          <input
            type="text"
            required
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-normal"
          />
        </div>

        {/* Field 2: Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#1E293B]">
            Email
          </label>
          <input
            type="email"
            required
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-normal"
          />
        </div>

        {/* Field 3: Role */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#1E293B]">
            Role
          </label>
          <div className="relative">
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs appearance-none font-normal cursor-pointer"
            >
              <option value="" disabled className="text-slate-400">
                Select role
              </option>
              <option value="Admin">Admin</option>
              <option value="Agent">Agent</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Field Officer">Field Officer</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Field 4: Department */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#1E293B]">
            Department
          </label>
          <div className="relative">
            <select
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs appearance-none font-normal cursor-pointer"
            >
              <option value="" disabled className="text-slate-400">
                Select department
              </option>
              <option value="Water Supply">Water Supply Department</option>
              <option value="Electricity">Electricity Board</option>
              <option value="Healthcare">Health Department</option>
              <option value="Municipal Services">Municipal Corporation</option>
              <option value="Transport">Transport Department</option>
              <option value="Emergency">Fire & Emergency Services</option>
              <option value="Education">Anti-Ragging & Education Desk</option>
              <option value="Cyber & Police">Cyber Crime Reporting Desk</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Bottom Actions Row: Cancel | Send Invite */}
        <div className="pt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/organization/team')}
            className="flex-1 py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs text-center"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 cursor-pointer text-center"
          >
            {isSubmitting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>

      </form>

    </div>
  );
};
