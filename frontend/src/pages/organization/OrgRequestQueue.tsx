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
  Skeleton,
  EmptyState,
} from '../../design-system/index.js';
import { ArrowRight, Inbox, Clock, HeartHandshake, FileQuestion, AlertCircle } from 'lucide-react';
import { CaseItem, CaseStatus } from '../../types/case.js';
import { getSocket, joinOrgRoom, leaveOrgRoom } from '../../services/socket.js';

export const OrgRequestQueue: React.FC = () => {
  const { user, token } = useAuth();
  const orgId = user?.organizationId;

  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    async function fetchCases() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (activeTab !== 'ALL') queryParams.set('status', activeTab);
        if (filter) queryParams.set('search', filter);

        const res = await fetch(`/api/v1/cases/organization/${orgId}?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          setCases(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load organization cases', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchCases();
    }, 200);

    return () => clearTimeout(timer);
  }, [orgId, token, activeTab, filter]);

  // Real-time live new case alerts via Socket.IO
  useEffect(() => {
    if (orgId) {
      joinOrgRoom(orgId);
      const socket = getSocket(token);

      const handleNewCase = (newCase: CaseItem) => {
        setCases((prev) => {
          if (prev.some((c) => c._id === newCase._id)) return prev;
          if (activeTab === 'ALL' || activeTab === 'SUBMITTED') {
            return [newCase, ...prev];
          }
          return prev;
        });
      };

      socket.on('org:new_case', handleNewCase);

      return () => {
        socket.off('org:new_case', handleNewCase);
        leaveOrgRoom(orgId);
      };
    }
  }, [orgId, token, activeTab]);

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="pending" size="sm">New</Badge>;
      case 'ACKNOWLEDGED':
        return <Badge variant="neutral" size="sm">Acknowledged</Badge>;
      case 'ASSIGNED':
        return <Badge variant="neutral" size="sm">Assigned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="progress" size="sm">In Progress</Badge>;
      case 'WAITING_FOR_USER':
        return <Badge variant="critical" size="sm">Awaiting User</Badge>;
      case 'WAITING_FOR_ORGANIZATION':
        return <Badge variant="pending" size="sm">User Replied</Badge>;
      case 'RESOLVED':
        return <Badge variant="resolved" size="sm">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral" size="sm">Closed</Badge>;
      case 'ESCALATED':
        return <Badge variant="critical" size="sm">Escalated</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BLOOD_REQUEST':
        return <HeartHandshake className="w-3.5 h-3.5 text-red-600" />;
      case 'COMPLAINT':
      case 'GRIEVANCE':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <FileQuestion className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const formatSla = (dueAtString?: string) => {
    if (!dueAtString) return '48h SLA';
    const due = new Date(dueAtString).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 3600));

    if (diffHours < 0) {
      return <span className="text-red-600 font-bold">SLA Breached ({Math.abs(diffHours)}h overdue)</span>;
    }
    return <span className="text-emerald-700">{diffHours} Hours Remaining</span>;
  };

  const tabItems = [
    { id: 'ALL', label: 'All Cases' },
    { id: 'SUBMITTED', label: 'New / Inbox' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'WAITING_FOR_USER', label: 'Waiting Citizen' },
    { id: 'WAITING_FOR_ORGANIZATION', label: 'User Replied' },
    { id: 'RESOLVED', label: 'Resolved' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Request Triage & Case Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Universal triage inbox for incoming citizen requests routed to your organization tenant.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onChange={(val) => setActiveTab(val)}
            />

            <div className="w-full sm:w-72">
              <Input
                placeholder="Search reference, title, or citizen..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
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
              icon={<Inbox className="h-6 w-6 text-slate-400" />}
              title="No Requests in Queue"
              description={
                filter
                  ? `No requests match '${filter}'.`
                  : `There are currently no cases matching filter '${activeTab}'.`
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Case Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Citizen Contact</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>SLA Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((r) => {
                  const citizenName =
                    typeof r.requesterId === 'object' && r.requesterId?.name
                      ? r.requesterId.name
                      : r.requesterName || 'Dev Citizen';

                  const agentName =
                    typeof r.assignedAgentId === 'object' && r.assignedAgentId?.name
                      ? r.assignedAgentId.name
                      : r.assignedAgentName || 'Unassigned';

                  return (
                    <TableRow key={r._id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {r.referenceNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900">{r.title}</div>
                        {r.routing && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                            <span className="font-mono uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {r.routing.destinationType}
                            </span>
                            {r.routing.department && (
                              <span className="truncate max-w-[160px] text-slate-600">{r.routing.department}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 uppercase font-medium">
                          {getTypeIcon(r.type)}
                          <span>{r.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-semibold ${
                            r.priority === 'HIGH' || r.priority === 'URGENT'
                              ? 'text-red-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {r.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{citizenName}</TableCell>
                      <TableCell className="text-xs text-slate-600">{agentName}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatSla(r.sla?.dueAt)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/organization/requests/${r._id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            Triage
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
