import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  Wrench,
  User,
  CheckCircle2,
} from 'lucide-react';

interface TimelineStep {
  id: string;
  title: string;
  time: string;
  icon: React.ElementType;
}

const EXPANDED_TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 's-1',
    title: 'Request Created',
    time: 'Apr 16, 10:24 AM',
    icon: FileText,
  },
  {
    id: 's-2',
    title: 'Assigned to Water Supply Dept',
    time: 'Apr 16, 10:55 AM',
    icon: Building2,
  },
  {
    id: 's-3',
    title: 'Field Team Updated',
    time: 'Apr 16, 11:20 AM',
    icon: Wrench,
  },
  {
    id: 's-4',
    title: 'Citizen Message',
    time: 'Apr 16, 12:15 PM',
    icon: User,
  },
  {
    id: 's-5',
    title: 'Status Changed to In Progress',
    time: 'Apr 16, 12:45 PM',
    icon: CheckCircle2,
  },
];

export const OrgTimelineExpanded: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const caseId = id ? (id.startsWith('mock-') ? id.replace('mock-', 'CPET-2025-') : id) : 'CPET-2025-1043';

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header: Back Arrow + Title (Screen 5 Exact) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          Case Timeline (Expanded)
        </h1>
      </div>

      {/* 2. Hero Header Card (Screen 5 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          
          {/* Circular Dynamic CPET Logo */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[2px] shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" className="opacity-20" />
                <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
              </svg>
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#1E293B] tracking-tight truncate">
              {caseId}
            </h2>
            <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
              Water Supply Issue
            </p>
            <p className="text-[11px] text-slate-400 font-normal truncate">
              Created 2h ago
            </p>
          </div>
        </div>

        {/* Status Pill on Top Right (Screen 5 Exact) */}
        <div className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF9EE] text-[#D97706] border border-amber-200/80 flex items-center gap-1 shrink-0">
          <span className="text-[10px]">›</span>
          <span>In Progress</span>
        </div>
      </div>

      {/* 3. Expanded Vertical Timeline (Screen 5 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
        <div className="relative pl-6 space-y-7">
          
          {/* Continuous Vertical Blue Connecting Line */}
          <div className="absolute top-4 bottom-4 left-[15px] w-0.5 bg-[#2563EB]" />

          {EXPANDED_TIMELINE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative flex items-start gap-4">
                
                {/* Blue Circular Icon */}
                <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>

                {/* Text Content */}
                <div className="min-w-0 pt-0.5 space-y-0.5">
                  <div className="text-xs sm:text-sm font-black text-[#1E293B]">
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {step.time}
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
};
