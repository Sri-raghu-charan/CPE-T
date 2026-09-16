import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert } from '../../design-system/index.js';
import { Building2, ArrowLeft } from 'lucide-react';

export const OrgLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user.role === 'CITIZEN' || user.role === 'DONOR') {
        throw new Error('This account is registered as a Citizen. Please use the Citizen Portal.');
      }
      navigate('/organization/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to gateway</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-700 text-white font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-base">CPET Organization Workspace</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-300 shadow-sm">
          <CardHeader>
            <CardTitle>Sign in to Organization Tenant</CardTitle>
            <CardDescription>
              Enterprise access for verified agency administrators and support agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Work Email Address"
                type="email"
                required
                placeholder="e.g. agent@utility.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" variant="primary" className="w-full bg-blue-700 hover:bg-blue-800" isLoading={isLoading}>
                Access Workspace
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Need to register your organization?{' '}
              <Link to="/organization/onboarding" className="font-semibold text-blue-700 underline">
                Onboard new entity
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
