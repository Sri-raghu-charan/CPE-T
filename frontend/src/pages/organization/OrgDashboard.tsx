import React, { useEffect, useState } from 'react';
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
  EmptyState,
} from '../../design-system/index.js';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  FileQuestion,
  Hourglass,
} from 'lucide-react';
import { CaseItem } from '../../types/case.js';

interface MetricsData {
  totalRequests: number;
  newRequests: number;
  submitted: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  escalated: number;
  slaComplianceRate: string;
  defaultSlaHours: number;
  recentCases?: CaseItem[];
}

export const OrgDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!user?.organizationId) return;
      try {
        const res = await fetch(`/api/v1/organizations/${user.organizationId}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setMetrics(json.data);
        }
      } catch (err) {
        console.error('Failed to load metrics', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user, token]);

  const metricCards = [
    {
      title: 'Total Requests',
      value: metrics?.totalRequests ?? 0,
      icon: Inbox,
      color: 'text-slate-900',
      badge: 'Cumulative',
      badgeVariant: 'neutral' as const,
    },
    {
      title: 'New',
      value: metrics?.newRequests ?? 0,
      icon: TrendingUp,
      color: 'text-blue-700',
      badge: 'Awaiting Triage',
      badgeVariant: 'pending' as const,
    },
    {
      title: 'Submitted',
      value: metrics?.submitted ?? 0,
      icon: FileQuestion,
      color: 'text-indigo-700',
      badge: 'Intake Received',
      badgeVariant: 'neutral' as const,
    },
    {
      title: 'In Progress',
      value: metrics?.inProgress ?? 0,
      icon: Clock,
      color: 'text-sky-700',
      badge: 'Active Work',
      badgeVariant: 'progress' as const,
    },
    {
      title: 'Waiting',
      value: metrics?.waiting ?? 0,
      icon: Hourglass,
      color: 'text-amber-700',
      badge: 'Pending Info',
      badgeVariant: 'escalated' as const,
    },
    {
      title: 'Resolved',
      value: metrics?.resolved ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      badge: 'Completed',
      badgeVariant: 'resolved' as const,
    },
    {
      title: 'Escalated',
      value: metrics?.escalated ?? 0,
      icon: AlertCircle,
      color: 'text-red-700',
      badge: 'SLA Breach',
      badgeVariant: 'critical' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Workspace Overview
            </h1>
            <Badge variant="progress" size="sm">Active Tenant</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status, intake queue, and SLA compliance monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-slate-500 block">SLA Benchmark:</span>
            <span className="font-mono font-bold text-slate-900">
              {metrics?.defaultSlaHours || 48} Hours Standard
            </span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="text-right text-xs">
            <span className="text-slate-500 block">SLA Compliance:</span>
            <span className="font-mono font-bold text-emerald-700">
              {metrics?.slaComplianceRate || '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid (7 Required Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="relative overflow-hidden border-slate-200 hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 truncate">{card.title}</span>
                  <div className={`p-1.5 rounded-md bg-slate-100 ${card.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                    {card.value}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <Badge variant={card.badgeVariant} size="sm">
                    {card.badge}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Request Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Request Queue</CardTitle>
              <CardDescription>
                Live citizen requests routed to your organization queue.
              </CardDescription>
            </div>
            <Link to="/organization/requests">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Full Queue
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !metrics?.recentCases || metrics.recentCases.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="No Active Requests"
              description="Your organization inbox currently has no pending requests."
              action={
                <Link to="/organization/requests">
                  <Button variant="outline" size="sm">
                    Open Request Queue
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Case Title</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Citizen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentCases.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-900">
                      {c.referenceNumber}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 max-w-[200px] truncate">
                      {c.title}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{c.category || c.type}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold uppercase ${
                          c.priority === 'URGENT' || c.priority === 'HIGH'
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {c.requesterName || (c.requesterId as any)?.name || 'Citizen'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === 'RESOLVED' || c.status === 'CLOSED'
                            ? 'resolved'
                            : c.status === 'ESCALATED'
                            ? 'critical'
                            : c.status === 'IN_PROGRESS'
                            ? 'progress'
                            : 'pending'
                        }
                        size="sm"
                      >
                        {c.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/organization/requests/${c._id}`}>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
