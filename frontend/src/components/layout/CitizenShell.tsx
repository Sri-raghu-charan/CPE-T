import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Home,
  FolderOpen,
  Heart,
  User,
  Plus,
  Mic,
  HelpCircle,
  Landmark,
  LogOut,
  ShieldCheck,
  Building2,
  Headphones,
  Layers,
  Sparkles,
  Bell,
} from 'lucide-react';
import { cn } from '../../design-system/utils.js';

export const CitizenShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isIntakePage = location.pathname.includes('/intake');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/citizen/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/citizen/login');
    }
  };

  const navLinks = [
    {
      to: '/citizen/home',
      label: 'Home Dashboard',
      icon: Home,
      badge: null,
    },
    {
      to: '/citizen/forms',
      label: 'Forms & Services Directory',
      icon: Layers,
      badge: 'Catalog',
      highlight: true,
    },
    {
      to: '/citizen/requests',
      label: 'My Requests & Tracking',
      icon: FolderOpen,
      badge: 'Live',
    },
    {
      to: '/citizen/intake',
      label: 'AI Voice Assistant',
      icon: Mic,
      badge: 'Smart Intake',
    },
    {
      to: '/citizen/blood',
      label: 'Emergency Blood Hub',
      icon: Heart,
      badge: 'SOS',
      urgent: true,
    },
    {
      to: '/citizen/requests/new?type=COMPLAINT',
      label: 'Bank & Financial Grievance',
      icon: Landmark,
      badge: '16+ Banks',
    },
    {
      to: '/citizen/help',
      label: 'Help Desk & FAQs',
      icon: HelpCircle,
      badge: null,
    },
    {
      to: '/citizen/profile',
      label: 'My Profile & Settings',
      icon: User,
      badge: null,
    },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'C';

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* ========================================================= */}
      {/* DESKTOP VERTICAL NAVIGATION SIDEBAR (Visible on lg+ screens) */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 h-screen sticky top-0 z-40 select-none">
        
        {/* Top: Logo, Portal Title & New Request Action */}
        <div className="p-5 flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-slate-900">CPET Portal</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Citizen</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-slate-500 font-medium">Live Resolution Gateway</span>
              </div>
            </div>
          </div>

          {/* Primary CTA: File New Request / AI Voice */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/citizen/intake')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-between transition-all hover:scale-[1.01] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-200 animate-pulse" />
                <span>Tell CPET with AI Voice</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/citizen/requests/new')}
              className="w-full py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Fill Manual Request Form</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
              Citizen Menu
            </span>
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 pl-2.5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        item.urgent ? 'text-rose-500' : 'text-slate-500 group-hover:text-blue-600'
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        item.urgent
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : item.highlight
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom: 24/7 Helpline & User Profile / Logout */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-3">
          
          {/* Quick Helpline Desk Card */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-800">24/7 Citizen Helpline</div>
                <div className="text-[10px] text-slate-500">1800-425-CPET</div>
              </div>
            </div>
            <a
              href="tel:18004252738"
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-xs transition-colors"
            >
              Call
            </a>
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center justify-between pt-1">
            <Link
              to="/citizen/profile"
              className="flex items-center gap-2.5 min-w-0 group hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user?.name || 'Citizen User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {user?.email || 'citizen@cpet.gov.in'}
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        
        {/* Desktop Top Header Bar (lg+ only) */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Public Portal</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-800 capitalize">
              {location.pathname.replace('/citizen/', '').replace('/', ' ➔ ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Emergency Blood Action */}
            <button
              type="button"
              onClick={() => navigate('/citizen/blood')}
              className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Blood Emergency SOS</span>
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => navigate('/citizen/requests')}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            {/* Switch Portal Link */}
            <Link
              to="/organization/dashboard"
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Org Console</span>
            </Link>
          </div>
        </header>

        {/* Page Content View Container */}
        <main
          className={cn(
            'flex-1 w-full',
            // Mobile styling (Clean edge-to-edge max-w-md container)
            'px-4 pt-3 pb-24 lg:pb-8 max-w-md mx-auto',
            // Desktop styling (Expands gracefully with wide container)
            'lg:max-w-5xl xl:max-w-6xl lg:px-8 lg:pt-6'
          )}
        >
          <Outlet />
        </main>

        {/* ========================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Hidden on lg+ screens) */}
        {/* ========================================================= */}
        {!isIntakePage && (
          <div className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl px-4 py-2.5 flex items-center justify-between z-50">
            
            {/* 1. Home */}
            <NavLink
              to="/citizen/home"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer',
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </NavLink>

            {/* 2. Requests */}
            <NavLink
              to="/citizen/requests"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer',
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <FolderOpen className="w-4 h-4" />
              <span>Requests</span>
            </NavLink>

            {/* 3. (+) Center Floating Plus Action Button */}
            <button
              type="button"
              onClick={() => navigate('/citizen/intake')}
              className="w-12 h-12 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg shadow-blue-500/30 flex items-center justify-center -mt-6 hover:scale-105 transition-transform cursor-pointer border-4 border-white"
              title="Tell CPET your problem"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>

            {/* 4. Blood Hub */}
            <NavLink
              to="/citizen/blood"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer',
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <Heart className="w-4 h-4" />
              <span>Blood Hub</span>
            </NavLink>

            {/* 5. Profile */}
            <NavLink
              to="/citizen/profile"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer',
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </NavLink>

          </div>
        )}

      </div>
    </div>
  );
};

