import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from '../../design-system/index.js';
import {
  FileQuestion,
  AlertCircle,
  HeartHandshake,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Mic,
} from 'lucide-react';
import { CaseItem } from '../../types/case.js';
import { useNavigate } from 'react-router-dom';

export const CitizenHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [recentCases, setRecentCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickPrompt, setQuickPrompt] = useState('');

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch('/api/v1/cases/my?tab=all', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setRecentCases((json.data || []).slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load recent cases', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, [token]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPrompt.trim()) {
      navigate(`/citizen/intake?q=${encodeURIComponent(quickPrompt.trim())}`);
    } else {
      navigate('/citizen/intake');
    }
  };

  const primaryServices = [
    {
      title: 'Service Request',
      description: 'Appliance, utility, or equipment servicing with automatic brand detection and direct routing.',
      icon: FileQuestion,
      badge: 'Standard SLA',
      href: '/citizen/requests/new?type=SERVICE_REQUEST',
    },
    {
      title: 'Complaint',
      description: 'Lodge formal grievance against a product, service, organization, institution, or facility.',
      icon: AlertCircle,
      badge: 'Escalation Protocol',
      href: '/citizen/requests/new?type=COMPLAINT',
    },
    {
      title: 'Blood',
      description: 'Request urgent blood units, discover donors across 5-level geographic proximity, or register as a donor.',
      icon: HeartHandshake,
      badge: 'Priority 6h SLA',
      href: '/citizen/blood',
    },
    {
      title: 'Track Requests',
      description: 'Inspect live status, two-way communications, audit timeline, and resolution milestones.',
      icon: Search,
      badge: 'Live Status',
      href: '/citizen/requests',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {user?.name || 'Citizen'}
            </h1>
            <Badge variant="resolved" size="sm">Verified Session</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            CPET Universal Citizen Service Center — Raise, track, and resolve with verified organizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/citizen/intake">
            <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}>
              Tell CPET What You Need
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-md shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted & Private</span>
          </div>
        </div>
      </div>

      {/* AI-First Conversational Hero Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white p-6 shadow-md">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              AI-First Intake Engine
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-300">English • हिन्दी • తెలుగు</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Tell CPET what you need — no complex forms required.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Describe your appliance repair, billing dispute, civic grievance, or emergency blood need in plain words. CPET extracts the details, matches the organization, and asks only what is missing.
            </p>
          </div>

          {/* Quick Input Bar */}
          <form onSubmit={handleQuickSubmit} className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Example: I have a Lloyd AC and it needs servicing..."
                className="w-full text-sm bg-slate-800/90 border border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
              <button
                type="button"
                onClick={() => navigate('/citizen/intake')}
                title="Voice dictation in conversational intake"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Analyze
            </Button>
          </form>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 text-[11px]">Try asking:</span>
            <button
              type="button"
              onClick={() => navigate('/citizen/intake?q=' + encodeURIComponent('I have a Lloyd AC and it needs servicing.'))}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
            >
              "Lloyd AC servicing"
            </button>
            <button
              type="button"
              onClick={() => navigate('/citizen/intake?q=' + encodeURIComponent('Urgent: need 2 units of O- blood immediately at City Trauma Hospital.'))}
              className="text-xs text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 px-2.5 py-1 rounded-md border border-rose-800/50 transition-colors"
            >
              "Urgent: O- blood needed"
            </button>
            <button
              type="button"
              onClick={() => navigate('/citizen/intake?q=' + encodeURIComponent('Streetlights on 5th cross road are not working.'))}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
            >
              "Streetlight civic grievance"
            </button>
          </div>
        </div>
      </div>

      {/* Primary Services Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Universal Citizen Entry Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {primaryServices.map((srv) => {
            const Icon = srv.icon;
            return (
              <Card
                key={srv.title}
                className="hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-slate-100 text-slate-900">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="neutral" size="sm">{srv.badge}</Badge>
                    </div>
                    <CardTitle className="text-base font-semibold">{srv.title}</CardTitle>
                    <CardDescription className="text-xs mt-1 leading-relaxed">
                      {srv.description}
                    </CardDescription>
                  </CardHeader>
                </div>
                <div className="p-6 pt-0">
                  <Link to={srv.href}>
                    <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Access Service
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity / Tracking Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Request Activity</CardTitle>
              <CardDescription>
                Live requests and two-way resolution interaction between you and responding organizations.
              </CardDescription>
            </div>
            <Link to="/citizen/requests">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : recentCases.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              You have no active cases yet. Click "Raise New Case" above to submit a request.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Service / Title</TableHead>
                  <TableHead>Recipient Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCases.map((c) => {
                  const orgName =
                    typeof c.organizationId === 'object' && c.organizationId?.name
                      ? c.organizationId.name
                      : c.organizationName || 'Assigned Organization';

                  return (
                    <TableRow key={c._id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {c.referenceNumber}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800 text-xs">
                        {c.title}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {orgName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === 'RESOLVED'
                              ? 'resolved'
                              : c.status === 'IN_PROGRESS'
                              ? 'progress'
                              : c.status === 'WAITING_FOR_USER'
                              ? 'critical'
                              : 'pending'
                          }
                          size="sm"
                        >
                          {c.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/citizen/requests/${c._id}`}>
                          <Button variant="outline" size="sm">
                            Inspect
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
