import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/auth.js';
import {
  ShieldAlert,
  ArrowRight,
  LogOut,
  ArrowLeft,
  User,
  Building2,
} from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectPath,
}) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Verifying session clearance...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const fallbackPath =
      redirectPath ||
      (location.pathname.startsWith('/organization')
        ? '/organization/login'
        : location.pathname.startsWith('/admin')
        ? '/admin/login'
        : '/citizen/login');
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const isCitizen = user.role === 'CITIZEN' || user.role === 'DONOR';
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'CPET_ADMIN';

    const userHomePath = isCitizen
      ? '/citizen/home'
      : isAdmin
      ? '/admin/dashboard'
      : '/organization/dashboard';

    const userHomeLabel = isCitizen
      ? 'Citizen Portal'
      : isAdmin
      ? 'Admin Dashboard'
      : 'Organization Dashboard';

    const targetLoginPath = location.pathname.startsWith('/organization')
      ? '/organization/login'
      : location.pathname.startsWith('/admin')
      ? '/admin/login'
      : '/citizen/login';

    const targetWorkspaceLabel = location.pathname.startsWith('/organization')
      ? 'Organization / Agency Portal'
      : location.pathname.startsWith('/admin')
      ? 'System Administration Portal'
      : 'Citizen Grievance Portal';

    const handleSwitchAccount = async () => {
      await logout();
      navigate(targetLoginPath, { replace: true });
    };

    const handleSignOut = async () => {
      await logout();
      navigate('/', { replace: true });
    };

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 sm:p-7 space-y-5">
          
          {/* Top Status Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/70 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Role Clearance Required
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Workspace Authorization Mismatch
              </p>
            </div>
          </div>

          {/* Context Explainer Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Current Active Account:</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                {user.role}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{user.name || user.email}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-200/60">
              You are currently logged in with a <strong>{user.role}</strong> account. The page you requested (<code className="font-mono text-[10px] bg-slate-200/70 px-1 py-0.5 rounded text-slate-700">{location.pathname}</code>) is part of the <strong>{targetWorkspaceLabel}</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Action 1: Return to User's Own Portal */}
            <button
              type="button"
              onClick={() => navigate(userHomePath)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Your {userHomeLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Action 2: Switch Account / Sign in as Target Workspace */}
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Switch Account (Log in to {targetWorkspaceLabel})</span>
            </button>

            {/* Action 3: Sign Out / Home */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Home</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return <>{children}</>;
};
