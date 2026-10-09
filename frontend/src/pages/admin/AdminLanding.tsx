import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const AdminLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#F4F7FB] flex flex-col justify-between items-center p-4 sm:p-6 font-sans select-none relative overflow-hidden text-slate-800">
      
      {/* Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Back to Gateway Bar */}
      <div className="w-full max-w-[420px] sm:max-w-[460px] flex items-center justify-between z-10 pt-2 pb-1">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200/80 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Gateway</span>
        </Link>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Admin Gateway
        </span>
      </div>

      {/* Main Center Card (Responsive on Mobile & Desktop) */}
      <div className="w-full max-w-[420px] sm:max-w-[460px] bg-white rounded-[32px] sm:rounded-[36px] shadow-xl shadow-blue-900/5 border border-slate-100 p-8 sm:p-10 flex flex-col justify-between relative z-10 my-auto text-center">
        
        {/* 1. CPET Logo & Brand Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[3.5px] shadow-lg shadow-blue-500/25 flex items-center justify-center mb-4">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <svg className="w-9 h-9 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" className="opacity-20" />
                <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
              </svg>
            </div>
          </div>

          <h1 className="font-black text-3xl tracking-tight text-[#1E293B] leading-none">
            CPET
          </h1>
          <p className="text-xs font-semibold text-slate-500 tracking-tight mt-1.5">
            Consumer Problem Escalation & Tracking
          </p>
        </div>

        {/* 2. Admin Portal Heading & Description */}
        <div className="mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] tracking-tight">
            Admin Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-xs mx-auto leading-relaxed">
            Manage organizations, services and workflows
          </p>
        </div>

        {/* 3. Primary CTA Button: Sign In */}
        <div className="space-y-6 mb-2">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="w-full py-4 px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer"
          >
            Sign In
          </button>

          {/* Tagline */}
          <div className="text-[11px] text-slate-400 font-medium tracking-wide">
            Secure. Transparent. Efficient.
          </div>
        </div>

      </div>

      {/* 4. Bottom Skyline Illustration (Exact vector silhouette of civic city architecture from Screen 1) */}
      <div className="w-full max-w-lg mt-auto pointer-events-none select-none relative opacity-85">
        <svg viewBox="0 0 600 160" className="w-full h-28 text-blue-300/80 fill-current" preserveAspectRatio="none">
          {/* Gentle background hills */}
          <path d="M0,120 C150,150 350,90 600,130 L600,160 L0,160 Z" opacity="0.3" fill="#93C5FD" />
          <path d="M0,135 C200,110 400,150 600,125 L600,160 L0,160 Z" opacity="0.5" fill="#BFDBFE" />
          
          {/* Skyline Buildings & Monuments Silhouette */}
          <g stroke="#3B82F6" strokeWidth="1.5" fill="none" opacity="0.6">
            {/* Monument 1 (Left Tower) */}
            <path d="M40,140 L40,60 L45,50 L50,60 L50,140" />
            <path d="M35,110 L55,110" />
            <path d="M38,80 L52,80" />
            <circle cx="45" cy="45" r="3" fill="#3B82F6" />

            {/* Gateway / Arch Landmark */}
            <path d="M75,140 L75,85 L85,75 L125,75 L135,85 L135,140" />
            <path d="M90,140 L90,105 C90,95 120,95 120,105 L120,140" />
            <path d="M100,75 L100,60 C100,55 110,55 110,60 L110,75" />
            <line x1="75" y1="90" x2="135" y2="90" />
            
            {/* High Rise Tower */}
            <path d="M145,140 L145,50 L160,35 L175,50 L175,140" />
            <line x1="160" y1="35" x2="160" y2="15" />
            <circle cx="160" cy="15" r="2" fill="#3B82F6" />
            <rect x="150" y="60" width="8" height="6" />
            <rect x="162" y="60" width="8" height="6" />
            <rect x="150" y="75" width="8" height="6" />
            <rect x="162" y="75" width="8" height="6" />
            <rect x="150" y="90" width="8" height="6" />
            <rect x="162" y="90" width="8" height="6" />

            {/* Dome Building */}
            <path d="M190,140 L190,100 L210,85 C220,70 240,70 250,85 L270,100 L270,140" />
            <path d="M220,85 L220,60 L240,60 L240,85" />
            <circle cx="230" cy="55" r="4" />

            {/* Modern Skyscrapers (Center-Right) */}
            <path d="M285,140 L285,65 L320,55 L320,140" />
            <path d="M330,140 L330,45 L365,45 L365,140" />
            <path d="M375,140 L375,70 L400,60 L425,70 L425,140" />
            
            {/* Right Tower */}
            <path d="M440,140 L440,80 L455,60 L470,80 L470,140" />
            <line x1="455" y1="60" x2="455" y2="35" />
            <circle cx="455" cy="35" r="2.5" fill="#3B82F6" />
            <path d="M485,140 L485,95 L520,95 L520,140" />
          </g>
        </svg>
      </div>

    </div>
  );
};
