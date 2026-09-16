import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Alert,
  Skeleton,
} from '../../design-system/index.js';
import {
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Send,
  User,
  Building2,
  CheckCircle2,
  Lock,
  Globe,
  UserCheck,
  Clock,
  MapPin,
  Check,
  CheckCheck,
  Paperclip,
} from 'lucide-react';
import { CaseItem, CaseStatus } from '../../types/case.js';
import { getSocket, joinCaseRoom, leaveCaseRoom } from '../../services/socket.js';

export const OrgRequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const orgId = user?.organizationId || '66d000000000000000000010';

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Response composer
  const [responseMsg, setResponseMsg] = useState('');
  const [responseType, setResponseType] = useState<'PUBLIC' | 'INTERNAL'>('PUBLIC');
  const [sendingResponse, setSendingResponse] = useState(false);

  // State machine transition dialog / inputs
  const [transitioning, setTransitioning] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assigningAgent, setAssigningAgent] = useState(false);

  const fetchCaseDetails = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to fetch case details.');
      }

      const json = await res.json();
      setCaseData(json.data);
      if (json.data.assignedAgentId) {
        const agId =
          typeof json.data.assignedAgentId === 'object'
            ? json.data.assignedAgentId._id
            : json.data.assignedAgentId;
        setSelectedAgentId(agId);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setTeamMembers(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load team members', err);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
    fetchTeamMembers();

    if (id) {
      joinCaseRoom(id);
      const socket = getSocket(token);

      const handleNewMessage = (newEvent: any) => {
        setCaseData((prev) => {
          if (!prev) return prev;
          const existingTimeline = prev.timeline || [];
          if (existingTimeline.some((e) => e._id === newEvent._id)) return prev;
          return {
            ...prev,
            timeline: [...existingTimeline, newEvent],
          };
        });
      };

      const handleReadUpdate = (data: { caseId: string; userId: string; role: string; readAt: string }) => {
        setCaseData((prev) => {
          if (!prev || !prev.timeline) return prev;
          return {
            ...prev,
            timeline: prev.timeline.map((item) => {
              const currentReads = item.readBy || [];
              if (currentReads.some((r) => r.userId === data.userId)) return item;
              return {
                ...item,
                readBy: [...currentReads, { userId: data.userId, role: data.role, readAt: data.readAt }],
              };
            }),
          };
        });
      };

      socket.on('case:new_message', handleNewMessage);
      socket.on('case:read_updated', handleReadUpdate);

      // Mark messages as read by organization agent
      fetch(`/api/v1/cases/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      return () => {
        socket.off('case:new_message', handleNewMessage);
        socket.off('case:read_updated', handleReadUpdate);
        leaveCaseRoom(id);
      };
    }
  }, [id, token, orgId]);

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseMsg.trim() || !id) return;

    setSendingResponse(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: responseMsg,
          isInternal: responseType === 'INTERNAL',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to send message.');

      setFeedbackNotice(
        responseType === 'PUBLIC'
          ? 'Public response successfully transmitted to citizen.'
          : 'Internal note logged in tenant audit record.'
      );
      setResponseMsg('');
      setTimeout(() => setFeedbackNotice(null), 4000);
      await fetchCaseDetails();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSendingResponse(false);
    }
  };

  const handleTransition = async (targetStatus: CaseStatus, defaultNote: string) => {
    if (!id || !caseData) return;

    setTransitioning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/cases/${id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus,
          message: defaultNote,
          expectedVersion: caseData.version,
          resolution:
            targetStatus === 'RESOLVED'
              ? { summary: defaultNote }
              : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to transition status.');

      setFeedbackNotice(`Case successfully transitioned to '${targetStatus}'.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
      await fetchCaseDetails();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!id || !selectedAgentId) return;

    setAssigningAgent(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/cases/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: selectedAgentId,
          notes: 'Assigned via case triage workspace.',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to assign agent.');

      setFeedbackNotice('Agent assigned successfully.');
      setTimeout(() => setFeedbackNotice(null), 4000);
      await fetchCaseDetails();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAssigningAgent(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{errorMsg || 'Case not found in this organization tenant.'}</Alert>
        <Link to="/organization/requests">
          <Button variant="outline" size="sm">Back to Request Queue</Button>
        </Link>
      </div>
    );
  }

  const citizenName =
    typeof caseData.requesterId === 'object' && caseData.requesterId?.name
      ? caseData.requesterId.name
      : caseData.requesterName || 'Dev Citizen';

  const citizenEmail =
    typeof caseData.requesterId === 'object' && caseData.requesterId?.email
      ? caseData.requesterId.email
      : caseData.requesterEmail || 'citizen@cpet.org';

  const citizenPhone =
    typeof caseData.requesterId === 'object' && caseData.requesterId?.phone
      ? caseData.requesterId.phone
      : caseData.requesterPhone || '+1 555-0199';

  const allowedTransitions = caseData.allowedTransitions || [];

  return (
    <div className="space-y-6">
      <Link
        to="/organization/requests"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Request Queue</span>
      </Link>

      {/* Case Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm text-slate-900">
                  REF: {caseData.referenceNumber}
                </span>
                <Badge variant="progress" size="sm">
                  {caseData.type.replace('_', ' ')}
                </Badge>
                <Badge
                  variant={
                    caseData.priority === 'HIGH' || caseData.priority === 'URGENT'
                      ? 'critical'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {caseData.priority} Priority
                </Badge>
                <Badge
                  variant={
                    caseData.status === 'RESOLVED'
                      ? 'resolved'
                      : caseData.status === 'WAITING_FOR_USER'
                      ? 'critical'
                      : 'pending'
                  }
                  size="sm"
                >
                  {caseData.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <CardTitle className="mt-2 text-xl">{caseData.title}</CardTitle>
              <CardDescription>
                Classification: {caseData.category} | Requester: {citizenName} ({citizenEmail}, {citizenPhone})
              </CardDescription>
            </div>

            {/* Dynamic State Machine Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {allowedTransitions.includes('ACKNOWLEDGED') && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={transitioning}
                  onClick={() =>
                    handleTransition('ACKNOWLEDGED', 'Official organization acknowledgement recorded.')
                  }
                >
                  Acknowledge
                </Button>
              )}

              {allowedTransitions.includes('IN_PROGRESS') && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={transitioning}
                  onClick={() =>
                    handleTransition('IN_PROGRESS', 'Active investigation and servicing commenced.')
                  }
                >
                  Start Investigation
                </Button>
              )}

              {allowedTransitions.includes('WAITING_FOR_USER') && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={transitioning}
                  onClick={() =>
                    handleTransition(
                      'WAITING_FOR_USER',
                      'Clarification requested: Please provide additional details or supporting evidence.'
                    )
                  }
                >
                  Request Info
                </Button>
              )}

              {allowedTransitions.includes('RESOLVED') && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={transitioning}
                  onClick={() =>
                    handleTransition(
                      'RESOLVED',
                      'Issue inspected, rectified, and validated under organization SLA.'
                    )
                  }
                >
                  Mark Resolved
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {feedbackNotice && <Alert variant="success">{feedbackNotice}</Alert>}
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {/* Two-Way Communication Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-700" />
                <CardTitle>Bidirectional Interaction & Event Timeline</CardTitle>
              </div>
              <CardDescription>
                Immutable chronological log of all citizen messages, team responses, and state changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {caseData.timeline && caseData.timeline.length > 0 ? (
                  caseData.timeline.map((item) => {
                    const isCitizen = item.actorRole === 'CITIZEN';
                    const isSystem = item.actorRole === 'SYSTEM';
                    const isInternal = item.isInternal;

                    return (
                      <div
                        key={item._id}
                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                          isInternal
                            ? 'bg-amber-50/50 border-amber-300'
                            : isCitizen
                            ? 'bg-slate-50 border-slate-200'
                            : isSystem
                            ? 'bg-blue-50/50 border-blue-200'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isInternal ? (
                              <Lock className="w-3.5 h-3.5 text-amber-700" />
                            ) : isCitizen ? (
                              <User className="w-3.5 h-3.5 text-slate-700" />
                            ) : isSystem ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span className="font-bold text-slate-900">{item.actorName}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                              {isInternal ? 'INTERNAL NOTE' : item.eventType.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-800 text-xs leading-relaxed pl-5">
                          {item.message}
                        </p>

                        {/* Attached Evidence or Documents */}
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 pl-5">
                            {item.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-[11px] text-slate-700 hover:text-slate-900 shadow-sm"
                              >
                                <Paperclip className="w-3 h-3 text-slate-500" />
                                <span className="font-medium truncate max-w-[150px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Read Receipt Tracker for Public Organization Responses */}
                        {!item.isInternal && (item.actorRole === 'ORGANIZATION_AGENT' || item.actorRole === 'ORGANIZATION_ADMIN') && (
                          <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400 mt-1">
                            {item.readBy?.some((r) => r.role === 'CITIZEN' || r.role === 'DONOR') ? (
                              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Read by Citizen
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Check className="w-3.5 h-3.5" />
                                Delivered to Citizen
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No events recorded.</p>
                )}
              </div>

              {/* Response Composer */}
              <form onSubmit={handleSendResponse} className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Message Type:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`text-xs px-2.5 py-1 rounded font-medium border flex items-center gap-1.5 ${
                        responseType === 'PUBLIC'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                      onClick={() => setResponseType('PUBLIC')}
                    >
                      <Globe className="w-3 h-3" />
                      Public to Citizen
                    </button>
                    <button
                      type="button"
                      className={`text-xs px-2.5 py-1 rounded font-medium border flex items-center gap-1.5 ${
                        responseType === 'INTERNAL'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                      onClick={() => setResponseType('INTERNAL')}
                    >
                      <Lock className="w-3 h-3" />
                      Internal Team Note
                    </button>
                  </div>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder={
                    responseType === 'PUBLIC'
                      ? 'Type official organization response delivered directly to the citizen...'
                      : 'Record private internal triage or escalation note (never visible to citizen)...'
                  }
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800"
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={sendingResponse}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    {responseType === 'PUBLIC' ? 'Transmit to Citizen' : 'Save Internal Note'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Assignment & SLA */}
        <div className="space-y-4">
          {/* Destination & Deterministic Routing Info Card */}
          {caseData.routing && (
            <Card className="border-indigo-100 bg-indigo-50/20">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Routing & Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-500">Channel Type:</span>
                  <Badge variant="progress" size="sm">
                    {caseData.routing.destinationType}
                  </Badge>
                </div>
                {caseData.routing.department && (
                  <div className="flex justify-between py-1 border-b border-indigo-100">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[170px] truncate">
                      {caseData.routing.department}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-500">Queue / Target:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[160px]">
                    {caseData.routing.destinationValue}
                  </span>
                </div>
                {caseData.externalDispatch && (
                  <div className="flex justify-between py-1 border-b border-indigo-100">
                    <span className="text-slate-500">External Dispatch:</span>
                    <Badge
                      variant={
                        caseData.externalDispatch.status === 'DELIVERED' || caseData.externalDispatch.status === 'SENT'
                          ? 'resolved'
                          : 'pending'
                      }
                      size="sm"
                    >
                      {caseData.externalDispatch.status}
                    </Badge>
                  </div>
                )}
                {caseData.routing.routeMatchedReason && (
                  <p className="text-[11px] text-slate-500 pt-1 leading-normal italic">
                    {caseData.routing.routeMatchedReason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agent Assignment Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-700" />
                <CardTitle className="text-sm font-semibold">Agent Assignment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">-- Select Handler --</option>
                {teamMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role.replace('ORGANIZATION_', '')})
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={assigningAgent}
                disabled={!selectedAgentId}
                onClick={handleAssignAgent}
              >
                Assign Handler
              </Button>
            </CardContent>
          </Card>

          {/* SLA Enforcement */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-700" />
                <CardTitle className="text-sm font-semibold">SLA Enforcement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Benchmark Window:</span>
                <span className="font-semibold text-slate-900">
                  {caseData.sla?.slaHours || 48} Hours
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Target Due Date:</span>
                <span className="font-semibold text-slate-900">
                  {caseData.sla?.dueAt ? new Date(caseData.sla.dueAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Structured Specs */}
          {caseData.structuredData && Object.keys(caseData.structuredData).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Structured Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {Object.entries(caseData.structuredData).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-semibold text-slate-900">{String(val)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Location */}
          {caseData.location && (caseData.location.city || caseData.location.address) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <CardTitle className="text-sm font-semibold">Location</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-slate-700 space-y-1">
                {caseData.location.address && <p>{caseData.location.address}</p>}
                {caseData.location.city && (
                  <p>
                    {caseData.location.city}
                    {caseData.location.pincode ? ` - ${caseData.location.pincode}` : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tenant Protection Badge */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Tenant Boundary</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Isolated to your organization</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Unauthorized organizations and unassociated agents cannot access this case record.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
