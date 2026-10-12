import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Flame,
} from 'lucide-react';

export const OrgPerformance: React.FC = () => {
  const navigate = useNavigate();

  const metrics = {
    slaCompliance: 92,
    target: 90,
    onTime: 221,
    delayed: 17,
    escalated: 4,
  };

  const weeklyTrend = [
    { day: 'Mon', onTime: 65, delayed: 8 },
    { day: 'Tue', onTime: 78, delayed: 10 },
    { day: 'Wed', onTime: 72, delayed: 12 },
    { day: 'Thu', onTime: 82, delayed: 6 },
    { day: 'Fri', onTime: 70, delayed: 9 },
    { day: 'Sat', onTime: 92, delayed: 14 },
    { day: 'Sun', onTime: 95, delayed: 15 },
  ];

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header: Back Arrow + Title (Screen 4 Exact) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/organization/dashboard')}
          aria-label="Back to dashboard"
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          SLA & Performance
        </h1>
      </div>

      {/* 2. Top Circular SLA Gauge Card (Screen 4 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex items-center justify-around gap-4">
        
        {/* Circular SVG Ring Gauge */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-[#10B981]"
              strokeDasharray={`${metrics.slaCompliance}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-xl font-black text-[#1E293B] tracking-tight">
            {metrics.slaCompliance}%
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-[#1E293B]">
            SLA Compliance
          </h2>
          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <span>↑ Target {metrics.target}%</span>
          </div>
        </div>

      </div>

      {/* 3. 3-Card Metrics Row: On Time | Delayed | Escalated (Screen 4 Exact) */}
      <div className="grid grid-cols-3 gap-2.5">
        
        {/* On Time */}
        <div className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
            <Clock className="w-3.5 h-3.5" />
            <span>On Time</span>
          </div>
          <div className="text-2xl font-black text-[#10B981] tracking-tight">
            {metrics.onTime}
          </div>
        </div>

        {/* Delayed */}
        <div className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Delayed</span>
          </div>
          <div className="text-2xl font-black text-[#F59E0B] tracking-tight">
            {metrics.delayed}
          </div>
        </div>

        {/* Escalated */}
        <div className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
            <Flame className="w-3.5 h-3.5" />
            <span>Escalated</span>
          </div>
          <div className="text-2xl font-black text-[#EF4444] tracking-tight">
            {metrics.escalated}
          </div>
        </div>

      </div>

      {/* 4. Performance Trend Bar Chart Card (Screen 4 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
        
        {/* Title & Legend */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1E293B]">
            Performance Trend
          </h2>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" />
              <span>On Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" />
              <span>Delayed</span>
            </div>
          </div>
        </div>

        {/* SVG Bar Chart */}
        <div className="pt-2">
          <svg viewBox="0 0 350 160" className="w-full h-44 overflow-visible">
            {/* Horizontal Grid lines */}
            <g stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3">
              <line x1="30" y1="20" x2="340" y2="20" />
              <line x1="30" y1="70" x2="340" y2="70" />
              <line x1="30" y1="120" x2="340" y2="120" />
            </g>

            {/* Y-Axis Labels */}
            <text x="8" y="24" className="text-[9px] fill-slate-400 font-mono">100</text>
            <text x="14" y="74" className="text-[9px] fill-slate-400 font-mono">50</text>
            <text x="20" y="124" className="text-[9px] fill-slate-400 font-mono">0</text>

            {/* Bar Groups */}
            {weeklyTrend.map((d, index) => {
              const xPos = 45 + index * 42;
              const barHeightOnTime = (d.onTime / 100) * 100;
              const barHeightDelayed = (d.delayed / 100) * 100;

              return (
                <g key={d.day}>
                  {/* On Time Bar (Blue) */}
                  <rect
                    x={xPos}
                    y={120 - barHeightOnTime}
                    width="10"
                    height={barHeightOnTime}
                    rx="2"
                    fill="#2563EB"
                  />

                  {/* Delayed Stacked Bar (Amber) */}
                  <rect
                    x={xPos}
                    y={120 - barHeightDelayed}
                    width="10"
                    height={barHeightDelayed}
                    rx="2"
                    fill="#F59E0B"
                  />

                  {/* X-Axis Day Label */}
                  <text
                    x={xPos - 2}
                    y="138"
                    className="text-[9px] fill-slate-400 font-medium"
                  >
                    {d.day}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

      </div>

    </div>
  );
};
