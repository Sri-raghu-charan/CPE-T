import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { Badge } from '../../design-system/index.js';

interface HeaderProps {
  backendLive: boolean;
}

export const Header: React.FC<HeaderProps> = ({ backendLive }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-slate-900 text-white font-bold tracking-wider">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-slate-900 text-base">CPET</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600 border border-slate-200">
              v1.0-alpha
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-none">
            Consumer Problem Escalation & Tracking
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Activity className="h-4 w-4 text-slate-400" />
          <span>API Gateway:</span>
          {backendLive ? (
            <Badge variant="resolved" size="sm">Operational</Badge>
          ) : (
            <Badge variant="pending" size="sm">Checking...</Badge>
          )}
        </div>
      </div>
    </header>
  );
};
