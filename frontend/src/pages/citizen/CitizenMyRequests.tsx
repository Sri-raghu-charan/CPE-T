import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Tabs,
  EmptyState,
  Skeleton,
} from '../../design-system/index.js';
import {
  Plus,
  ArrowRight,
  Clock,
  Building2,
  FileQuestion,
  AlertCircle,
  HeartHandshake,
} from 'lucide-react';
import { CaseItem, CaseStatus } from '../../types/case.js';

export const CitizenMyRequests: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'resolved' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCases() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (activeTab !== 'all') queryParams.set('tab', activeTab);
        if (search) queryParams.set('search', search);

        const res = await fetch(`/api/v1/cases/my?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          setCases(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch citizen cases', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadCases();
    }, 200);

    return () => clearTimeout(timer);
  }, [token, activeTab, search]);

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="pending" size="sm">Submitted</Badge>;
      case 'ACKNOWLEDGED':
        return <Badge variant="neutral" size="sm">Acknowledged</Badge>;
      case 'ASSIGNED':
        return <Badge variant="neutral" size="sm">Assigned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="progress" size="sm">In Progress</Badge>;
      case 'WAITING_FOR_USER':
        return <Badge variant="critical" size="sm">Waiting for You</Badge>;
      case 'WAITING_FOR_ORGANIZATION':
        return <Badge variant="pending" size="sm">Response Sent</Badge>;
      case 'RESOLVED':
        return <Badge variant="resolved" size="sm">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral" size="sm">Closed</Badge>;
      case 'ESCALATED':
        return <Badge variant="critical" size="sm">Escalated</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" size="sm">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BLOOD_REQUEST':
        return <HeartHandshake className="w-4 h-4 text-red-600" />;
      case 'COMPLAINT':
      case 'GRIEVANCE':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <FileQuestion className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatSla = (dueAtString?: string) => {
    if (!dueAtString) return 'SLA Not Set';
    const due = new Date(dueAtString).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 3600));

    if (diffHours < 0) {
      return <span className="text-red-600 font-bold">SLA Breached ({Math.abs(diffHours)}h overdue)</span>;
    }
    return <span className="text-emerald-700">{diffHours} Hours Remaining</span>;
  };

  const tabItems = [
    { id: 'all', label: 'All Cases' },
    { id: 'active', label: 'Active' },
    { id: 'pending', label: 'Pending Info' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Requests & Escalations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Universal tracking console for service requests, complaints, civic grievances, and blood requirements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/citizen/requests/new">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Raise New Case
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
            />

            <div className="w-full sm:w-72">
              <Input
                placeholder="Search reference, title, or org..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={<FileQuestion className="h-6 w-6 text-slate-500" />}
              title="No Cases Found"
              description={
                search
                  ? `No requests match your search query '${search}'.`
                  : `You currently have no cases in the '${activeTab}' tab.`
              }
              action={
                <Link to="/citizen/requests/new">
                  <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Raise Your First Request
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Case Title</TableHead>
                  <TableHead>Assigned Organization</TableHead>
                  <TableHead>SLA Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => {
                  const orgName =
                    typeof c.organizationId === 'object' && c.organizationId?.name
                      ? c.organizationId.name
                      : c.organizationName || 'Assigned Organization';

                  return (
                    <TableRow key={c._id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">
                        {c.referenceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          {getTypeIcon(c.type)}
                          <span className="font-medium text-[11px] uppercase tracking-wide">
                            {c.type.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900 text-xs line-clamp-1">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {c.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{orgName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatSla(c.sla?.dueAt)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/citizen/requests/${c._id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                          >
                            Timeline
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
