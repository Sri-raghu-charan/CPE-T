import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Zap,
  Clock,
  HeartHandshake,
  CheckCircle2,
  Lock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import heroIllustration from '../assets/hero-illustration.webp';

export const SplashScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCitizenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && (user?.role === 'CITIZEN' || user?.role === 'DONOR')) {
      navigate('/citizen/home');
    } else {
      navigate('/citizen/login');
    }
  };

  const handleOrgClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (
      isAuthenticated &&
      (user?.role === 'ORGANIZATION_ADMIN' ||
        user?.role === 'ORGANIZATION_AGENT' ||
        user?.role === 'SUPER_ADMIN' ||
        user?.role === 'CPET_ADMIN')
    ) {
      navigate('/organization/dashboard');
    } else {
      navigate('/organization/login');
    }
  };

  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && (user?.role === 'SUPER_ADMIN' || user?.role === 'CPET_ADMIN')) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col justify-between font-sans text-slate-900 select-none relative overflow-x-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header Bar (Desktop & Mobile) */}
      <header className="w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand Title */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-[2px] shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white">
                <svg
                  className="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-[#1E293B] tracking-tight leading-none">
                CPET
              </span>
              <span className="text-[10px] font-semibold text-blue-600 tracking-tight leading-tight hidden sm:inline">
                Consumer Problem Escalation & Tracking
              </span>
            </div>
          </Link>

          {/* Header Right Status & Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gateway Live • 24/7 Resolution</span>
            </div>

            <Link
              to="/foundation"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors hidden md:inline-flex items-center gap-1"
            >
              <span>Architecture</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={handleAdminClick}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Hero Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Hero Column (Desktop Expanded Presentation) */}
          <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide mx-auto lg:mx-0 w-fit shadow-xs">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Unified Public & Enterprise Resolution Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
              Tell us your problem.<br className="hidden sm:inline" />{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                We'll help resolve it.
              </span>
            </h1>

            {/* Lead Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Connect directly with municipal utilities, consumer appliances, public transport, and emergency blood networks. Guaranteed SLA resolution timelines with tamper-evident cryptographic tracking.
            </p>

            {/* Desktop Capability Feature Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Automated 48h SLA Tracking</h2>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Strict timers with multi-tier grievance escalation.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Direct Department Routing</h2>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Automated queue dispatch to verified authorities.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Emergency Blood Hub</h2>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">5-level geographic discovery with privacy relay.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Tamper-Evident Audit Trail</h2>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Cryptographic log of all status transitions.</p>
                </div>
              </div>
            </div>

            {/* Impact Metrics Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span><strong>100%</strong> Verified Agencies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span><strong>48h</strong> Max Response SLA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                <span><strong>Instant OTP</strong> Multi-Factor Auth</span>
              </div>
            </div>

          </div>

          {/* Right Action Card Column (Desktop & Mobile Optimized) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[420px] lg:max-w-md bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl shadow-blue-900/10 border border-slate-100 p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden">
              
              {/* Header inside card (Mobile view emphasizes this) */}
              <div className="text-center lg:hidden mb-4">
                <div className="inline-flex items-center justify-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-[2px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-xl font-black text-[#1E293B]">CPET</span>
                </div>
                <p className="text-xs font-semibold text-blue-600">
                  Consumer Problem Escalation & Tracking
                </p>
              </div>

              {/* Hero Artwork Illustration */}
              <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-blue-50/60 bg-blue-50/30 relative group mb-5">
                <img
                  src={heroIllustration}
                  alt="Citizen connecting with city resolution platform"
                  width={840}
                  height={416}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-44 sm:h-52 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent flex items-end p-4">
                  <span className="text-white text-xs font-semibold drop-shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Civic & Consumer Resolution Gateway
                  </span>
                </div>
              </div>

              {/* Interactive Role Portals */}
              <div className="space-y-3">
                
                {/* 1. Citizen Portal (Primary CTA) */}
                <button
                  onClick={handleCitizenClick}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm leading-tight">Continue as Citizen</div>
                      <div className="text-[11px] text-blue-100 font-normal leading-tight mt-0.5">File complaints, track requests & emergency blood</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 flex-shrink-0" />
                </button>

                {/* 2. Organization Portal */}
                <button
                  onClick={handleOrgClick}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 text-slate-800 font-semibold text-xs transition-all flex items-center justify-between group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Organization / Agency Login</div>
                      <div className="text-[10px] text-slate-500 font-normal">Department triage & SLA fulfillment workspace</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* 3. Admin Login Link */}
                <div className="pt-2 text-center">
                  <button
                    onClick={handleAdminClick}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer inline-flex items-center gap-1 hover:underline"
                  >
                    <span>System Administrator Login</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Card Footer Security Assurance */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Enterprise & Government Grade Security</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full border-t border-slate-200/60 bg-white/50 backdrop-blur-xs py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            © 2026 CPET Platform. Consumer Problem Escalation & Tracking.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/health" className="hover:text-blue-600 transition-colors">System Health</Link>
            <span>•</span>
            <Link to="/design-system" className="hover:text-blue-600 transition-colors">Design System</Link>
            <span>•</span>
            <span className="text-slate-400">End-to-End Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
