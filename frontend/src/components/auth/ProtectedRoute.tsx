import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/auth.js';
import { Alert, Card, CardHeader, CardTitle, CardContent, Button } from '../../design-system/index.js';
import { ShieldAlert } from 'lucide-react';

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
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

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
    const fallbackPath = redirectPath || (location.pathname.startsWith('/organization') ? '/organization/login' : '/citizen/login');
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-12 p-4">
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              <CardTitle className="text-red-900">Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="error" title="Restricted Workspace">
              Your account role (<code className="font-mono font-bold">{user.role}</code>) does not have authorization to access this workspace.
            </Alert>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
