import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, LogOut, UserCheck, Home, Clock, User } from 'lucide-react';
import { Badge, Button } from '../../design-system/index.js';
import { cn } from '../../design-system/utils.js';

export const CitizenShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Services & Home', href: '/citizen/home', icon: Home },
    { name: 'Track Requests', href: '/citizen/requests', icon: Clock },
    { name: 'Profile & Privacy', href: '/citizen/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Citizen Header */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-slate-900 text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-slate-900 text-base">CPET</span>
              <span className="text-[11px] text-slate-500 block leading-none">Citizen Portal</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="text-right leading-tight">
              <span className="font-medium text-slate-900 block">{user?.name || 'Citizen'}</span>
              <Badge variant="neutral" size="sm">CITIZEN</Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-400">
        CPET Citizen Services &copy; 2026. Official Resolution Protocol.
      </footer>
    </div>
  );
};
