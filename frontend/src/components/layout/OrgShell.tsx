import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Building2,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { cn } from '../../design-system/utils.js';

export const OrgShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    await logout();
    navigate('/organization/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/organization/dashboard', icon: LayoutDashboard },
    { name: 'Forms Studio', href: '/organization/forms', icon: Layers },
    { name: 'Requests', href: '/organization/requests', icon: Inbox },
    { name: 'Team', href: '/organization/team', icon: Users },
    { name: 'Organization', href: '/organization/profile', icon: Building2 },
    { name: 'Reports', href: '/organization/performance', icon: BarChart3 },
    { name: 'Settings', href: '/organization/settings', icon: Settings },
  ];

  const orgName = user?.organizationName || 'ABC Healthcare Ltd.';
  const userName = user?.name || 'Medha Sri Varsha';
  const userRole = user?.role === 'ORGANIZATION_ADMIN' ? 'Admin' : 'Agent';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'MS';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/organization/requests?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex font-sans select-none text-slate-800 antialiased">
      
      {/* ========================================================= */}
      {/* 1. FIXED VERTICAL LEFT SIDEBAR (Matching uploaded design) */}
      {/* ========================================================= */}
      <aside
        className={cn(
          'hidden sm:flex flex-col justify-between bg-white border-r border-slate-200/90 transition-all duration-300 z-40 sticky top-0 h-screen shrink-0 shadow-xs select-none',
          isSidebarCollapsed ? 'w-20 px-3 py-5' : 'w-64 px-5 py-6'
        )}
      >
        <div className="flex flex-col gap-6">
          {/* Top Brand Logo & Collapse Toggle */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => navigate('/organization/dashboard')}
              className="flex items-center gap-3 cursor-pointer overflow-hidden group"
            >
              {/* Circular CPET Gradient Swirl Logo */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[2.5px] shadow-sm shadow-blue-500/20 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" className="opacity-20" />
                    <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                    <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
                  </svg>
                </div>
              </div>
              
              {!isSidebarCollapsed && (
                <div className="leading-tight overflow-hidden">
                  <span className="font-black text-xl tracking-tight text-[#1E293B] block">
                    CPET
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 block whitespace-nowrap truncate">
                    Consumer Problem Escalation & Tracking
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          {/* Active Organization Badge Card */}
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-800 text-xs font-bold shadow-2xs">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate text-slate-700 font-bold">{orgName}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-blue-600 shadow-2xs" title={orgName}>
              <Building2 className="w-4 h-4" />
            </div>
          )}

          {/* Vertical Menu Items */}
          <nav className="flex flex-col gap-1.5 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || (item.href !== '/organization/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer',
                    isActive
                      ? 'bg-[#EBF3FE] text-[#2563EB] shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  )}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#2563EB]' : 'text-slate-400')} />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="pt-4 border-t border-slate-100">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors">
              <div
                onClick={() => navigate('/organization/profile')}
                className="flex items-center gap-2.5 cursor-pointer overflow-hidden min-w-0"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div className="leading-tight truncate">
                  <span className="font-bold text-xs text-slate-800 block truncate">{userName}</span>
                  <span className="text-[10px] text-slate-400 font-medium block">{userRole}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MOBILE SLIDE-OUT DRAWER (For small screens) */}
      {/* ========================================================= */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col justify-between p-6 shadow-2xl z-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    CPET
                  </div>
                  <span className="font-black text-lg text-slate-900">CPET Portal</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  aria-label="Close mobile menu"
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="truncate">{orgName}</span>
              </div>

              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                        isActive
                          ? 'bg-[#EBF3FE] text-[#2563EB]'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <div className="text-xs font-bold text-slate-800">{userName}</div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MAIN WORKSPACE CONTENT WRAPPER */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-transparent px-4 sm:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          
          {/* Mobile Hamburger Toggle (sm:hidden) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="sm:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input Box (Matching Screen 3 & 4) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search requests..."
                aria-label="Search requests"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/90 border border-slate-200/80 rounded-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </form>

          {/* Right Action Icons: Notification Bell + User Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/organization/notifications')}
              aria-label="Notifications"
              className="p-2 rounded-full bg-white border border-slate-200/80 text-slate-500 hover:text-blue-600 hover:border-blue-200 shadow-2xs transition-colors cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/organization/profile')}
              aria-label="User profile settings"
              className="w-9 h-9 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
              title={`${userName} (${userRole})`}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Main Routed Page Content */}
        <main className="flex-1 px-4 sm:px-8 pb-10 flex flex-col justify-start">
          <Outlet />
        </main>
      </div>

    </div>
  );
};
