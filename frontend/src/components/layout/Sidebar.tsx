import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Palette, GitBranch, Layers } from 'lucide-react';
import { cn } from '../../design-system/utils.js';

export const Sidebar: React.FC = () => {
  const navigation = [
    { name: 'Architecture Overview', href: '/', icon: LayoutDashboard },
    { name: 'UI Design System', href: '/design-system', icon: Palette },
    { name: 'API Modules & Boundary', href: '/modules', icon: Layers },
    { name: 'System Probes', href: '/health', icon: GitBranch },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-slate-100">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Foundation Navigation
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
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

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">CPET Architecture</p>
          <p className="text-[11px] text-slate-500">
            Strict separation: Frontend / Backend / Database.
          </p>
        </div>
      </div>
    </aside>
  );
};
