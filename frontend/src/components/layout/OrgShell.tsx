import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Building2,
  LayoutDashboard,
  Inbox,
  Users,
  Settings,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { Badge, Button } from '../../design-system/index.js';
import { cn } from '../../design-system/utils.js';

export const OrgShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard & Metrics', href: '/organization/dashboard', icon: LayoutDashboard },
    { name: 'Request Queue', href: '/organization/requests', icon: Inbox },
    { name: 'Team Members', href: '/organization/team', icon: Users },
    { name: 'Organization Settings', href: '/organization/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Organization Header */}
      <header className="h-16 border-b border-slate-300 bg-slate-900 text-white px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-600 text-white font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">CPET Workspace</span>
              <Badge variant="progress" size="sm" className="bg-blue-900 text-blue-200 border-blue-700">
                TENANT
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">
              {user?.organizationName || 'Enterprise Tenant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="text-right leading-tight">
              <span className="font-medium text-white block">{user?.name}</span>
              <span className="text-[11px] text-slate-400 font-mono">{user?.role}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Exit Workspace
          </Button>
        </div>
      </header>

      {/* Main Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace Operations
            </span>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>Multi-Tenant Boundary</span>
            </div>
            <p>Queries restricted to tenant ID: <code className="font-mono text-[10px]">{user?.organizationId || 'unassigned'}</code></p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
