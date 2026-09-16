import React from 'react';
import { Shield, Server, Database, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../design-system/index.js';

export const ArchitectureOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          CPET Platform Architecture
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consumer Problem Escalation & Tracking — Strict 3-Tier Separation & Foundation Verification
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Frontend Tier */}
        <Card className="border-t-4 border-t-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 rounded bg-slate-100 text-slate-800">
                <Shield className="w-5 h-5" />
              </div>
              <Badge variant="progress">Presentation</Badge>
            </div>
            <CardTitle className="mt-3">/frontend</CardTitle>
            <CardDescription>React 18, Vite, TypeScript, Tailwind CSS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Only presentation and UI client-side interaction</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Zero direct MongoDB or database driver access</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Zero secrets or environment credentials exposed</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Modular enterprise design system primitives</span>
            </div>
          </CardContent>
        </Card>

        {/* Backend Tier */}
        <Card className="border-t-4 border-t-blue-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 rounded bg-blue-50 text-blue-700">
                <Server className="w-5 h-5" />
              </div>
              <Badge variant="progress">Business Logic</Badge>
            </div>
            <CardTitle className="mt-3">/backend</CardTitle>
            <CardDescription>Node.js, Express, TypeScript, REST API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Centralized error handling and logging</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Helmet security headers, strict CORS, correlation IDs</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Active rate limiting and Zod request validation</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Modular monolith boundary for all 20 domain areas</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Tier */}
        <Card className="border-t-4 border-t-emerald-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 rounded bg-emerald-50 text-emerald-700">
                <Database className="w-5 h-5" />
              </div>
              <Badge variant="progress">Persistence</Badge>
            </div>
            <CardTitle className="mt-3">/database</CardTitle>
            <CardDescription>MongoDB, Mongoose, Auditing & Tenant Plugins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Isolated database connection manager with pooling</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Audit schema plugin (soft deletes, created/updated fields)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Tenant isolation plugin enforcing organization scoping</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Liveness & readiness health probe reporting</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-Way Flow Principle */}
      <Card>
        <CardHeader>
          <CardTitle>Non-Negotiable Two-Way Interaction Architecture</CardTitle>
          <CardDescription>
            CPET guarantees authentic bidirectional workflows between citizens and organizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-center sm:text-left">
              <span className="text-xs font-semibold uppercase text-slate-500">Origin</span>
              <p className="text-sm font-bold text-slate-900">Citizens & Users</p>
              <p className="text-xs text-slate-500">Raise requests, complaints, blood needs</p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
              <span>Escalates</span>
              <ArrowRight className="w-4 h-4" />
              <Badge variant="progress">CPET Engine</Badge>
              <ArrowRight className="w-4 h-4" />
              <span>Resolves</span>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-xs font-semibold uppercase text-slate-500">Recipient</span>
              <p className="text-sm font-bold text-slate-900">Organizations & Agencies</p>
              <p className="text-xs text-slate-500">Assign, track, respond, resolve with SLA</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
