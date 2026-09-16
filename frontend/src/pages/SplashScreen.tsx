import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserCheck, Building2, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../design-system/index.js';

export const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Banner */}
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-slate-900 text-white font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-900 text-lg">CPET</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600 border border-slate-200">
                  Universal Platform
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Consumer Problem Escalation & Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/foundation" className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium">
              <span>Foundation Architecture</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / Gateway Selection */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="progress" size="sm">Two-Way Enterprise Resolution</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            A genuine two-way bridge between Citizens and Organizations.
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            CPET guarantees authentic bidirectional resolution for service requests, complaints, and emergency requirements with strict multi-tenant privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Citizen Entry Point */}
          <Card className="hover:border-slate-400 transition-colors flex flex-col justify-between p-2">
            <div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-lg bg-slate-100 text-slate-900">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <Badge variant="neutral">Citizen Portal</Badge>
                </div>
                <CardTitle className="text-xl">Citizen / User</CardTitle>
                <CardDescription>
                  For individuals submitting and tracking requests, complaints, and emergency blood needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span>Raise product & service requests with official reference IDs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span>Track real-time responses and resolution status</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span>Emergency blood donor discovery & requirement alerts</span>
                </div>
              </CardContent>
            </div>
            <div className="p-6 pt-0 space-y-2">
              <Link to="/citizen/login" className="block">
                <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Enter Citizen Portal
                </Button>
              </Link>
              <div className="text-center">
                <Link to="/citizen/signup" className="text-xs text-slate-500 hover:text-slate-900">
                  New citizen? <span className="font-semibold underline">Register account</span>
                </Link>
              </div>
            </div>
          </Card>

          {/* Organization Entry Point */}
          <Card className="hover:border-slate-400 transition-colors flex flex-col justify-between p-2">
            <div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-lg bg-blue-50 text-blue-700">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <Badge variant="progress">Enterprise Workspace</Badge>
                </div>
                <CardTitle className="text-xl">Organization</CardTitle>
                <CardDescription>
                  For utility boards, municipal agencies, healthcare systems, and enterprise support teams.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Tenant-isolated request queue with SLA monitors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Internal assignment and bidirectional citizen communication</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Team roster management and SLA configuration</span>
                </div>
              </CardContent>
            </div>
            <div className="p-6 pt-0 space-y-2">
              <Link to="/organization/login" className="block">
                <Button variant="primary" className="w-full bg-blue-700 hover:bg-blue-800" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Access Organization Workspace
                </Button>
              </Link>
              <div className="text-center">
                <Link to="/organization/onboarding" className="text-xs text-slate-500 hover:text-slate-900">
                  Register new entity? <span className="font-semibold underline">Onboard Organization</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-8 text-center text-xs text-slate-500">
        CPET Enterprise Platform &copy; 2026. Secure, tenant-isolated architecture.
      </footer>
    </div>
  );
};
