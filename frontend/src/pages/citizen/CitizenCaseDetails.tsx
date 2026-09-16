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
  AlertTriangle,
  RotateCcw,
  XCircle,
  MapPin,
  Check,
  CheckCheck,
  Paperclip,
  Clock,
  Flame,
  ShieldAlert,
  History,
  Star,
} from 'lucide-react';
import { CaseItem, CaseStatus } from '../../types/case.js';
import { getSocket, joinCaseRoom, leaveCaseRoom } from '../../services/socket.js';

export const CitizenCaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Messaging & Reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Status Action state
  const [actionLoading, setActionLoading] = useState(false);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: feedbackRating,
          comments: feedbackComments.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to submit feedback.');

      setActionNotice('Thank you! Your feedback has been recorded.');
      setCaseData((prev) => (prev ? { ...prev, feedback: json.data.feedback } : prev));
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const fetchCase = async () => {
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading case details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();

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

      const handleCaseEscalated = (data: any) => {
        setCaseData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'ESCALATED',
            sla: {
              ...prev.sla,
              isEscalated: true,
              status: 'BREACHED',
              currentEscalationTier: data.tier,
            },
            routing: prev.routing ? { ...prev.routing, department: data.department } : prev.routing,
          };
        });
        setActionNotice(`Case escalated to ${data.tier}!`);
      };

      const handleSlaUpdate = (data: any) => {
        setCaseData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sla: {
              ...prev.sla,
              status: data.slaStatus,
              isEscalated: data.isEscalated,
              currentEscalationTier: data.currentTier,
            },
          };
        });
      };

      socket.on('case:new_message', handleNewMessage);
      socket.on('case:read_updated', handleReadUpdate);
      socket.on('case:escalated', handleCaseEscalated);
      socket.on('case:sla_update', handleSlaUpdate);

      // Mark messages as read by citizen
      fetch(`/api/v1/cases/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      return () => {
        socket.off('case:new_message', handleNewMessage);
        socket.off('case:read_updated', handleReadUpdate);
        socket.off('case:escalated', handleCaseEscalated);
        socket.off('case:sla_update', handleSlaUpdate);
        leaveCaseRoom(id);
      };
    }
  }, [id, token]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !id) return;

    setSendingMsg(true);
    try {
      const attachments = [];
      if (attachmentName.trim() && attachmentUrl.trim()) {
        attachments.push({
          name: attachmentName.trim(),
          url: attachmentUrl.trim(),
          fileType: 'application/octet-stream',
          size: 1024,
        });
      }

      const res = await fetch(`/api/v1/cases/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: replyMessage,
          isInternal: false,
          attachments,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to send message.');

      setReplyMessage('');
      setAttachmentName('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
      setActionNotice('Response submitted to organization timeline.');
      setTimeout(() => setActionNotice(null), 4000);
      await fetchCase();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleStatusTransition = async (targetStatus: CaseStatus, message: string) => {
    if (!id || !caseData) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus,
          message,
          expectedVersion: caseData.version,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to transition status.');

      setActionNotice(`Case status successfully updated to '${targetStatus}'.`);
      setTimeout(() => setActionNotice(null), 4000);
      await fetchCase();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Alert variant="error">{errorMsg || 'Case not found.'}</Alert>
        <Link to="/citizen/requests">
          <Button variant="outline" size="sm">Back to My Requests</Button>
        </Link>
      </div>
    );
  }

  const orgName =
    typeof caseData.organizationId === 'object' && caseData.organizationId?.name
      ? caseData.organizationId.name
      : caseData.organizationName || 'Apex Power & Water';

  const formatSla = (dueAtString?: string) => {
    if (!dueAtString) return 'Standard SLA';
    const due = new Date(dueAtString).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 3600));

    if (diffHours < 0) {
      return <span className="text-red-600 font-bold">Breached ({Math.abs(diffHours)}h overdue)</span>;
    }
    return <span className="text-emerald-700">{diffHours}h Remaining</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/citizen/requests"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Requests</span>
      </Link>

      {/* Case Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm text-slate-900">
                  {caseData.referenceNumber}
                </span>
                <Badge variant="progress" size="sm">
                  {caseData.type.replace('_', ' ')}
                </Badge>
                <Badge
                  variant={
                    caseData.priority === 'URGENT' || caseData.priority === 'HIGH'
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
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Assigned to {orgName}</span>
                <span>•</span>
                <span>Category: {caseData.category}</span>
              </CardDescription>
            </div>

            {/* Quick Actions based on status */}
            <div className="flex items-center gap-2">
              {caseData.status === 'SUBMITTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={() =>
                    handleStatusTransition('CANCELLED', 'Citizen withdrew request prior to acknowledgement.')
                  }
                  leftIcon={<XCircle className="w-3.5 h-3.5 text-slate-500" />}
                >
                  Cancel Request
                </Button>
              )}

              {caseData.status === 'RESOLVED' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={actionLoading}
                    onClick={() =>
                      handleStatusTransition('REOPENED', 'Citizen disputed resolution within permitted window.')
                    }
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
                  >
                    Dispute & Reopen
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={actionLoading}
                    onClick={() =>
                      handleStatusTransition('CLOSED', 'Citizen verified resolution and confirmed closure.')
                    }
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Confirm & Close
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {actionNotice && <Alert variant="success">{actionNotice}</Alert>}
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {/* Prominent Action Banner for WAITING_FOR_USER */}
      {caseData.status === 'WAITING_FOR_USER' && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Organization Action Required
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                The organization has requested additional information or clarification to proceed with your case.
                Please provide your response in the message composer below.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Prominent Resolution Review Banner for RESOLVED */}
      {caseData.status === 'RESOLVED' && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Organization Marked This Case as Resolved
              </div>
              <p className="text-xs text-emerald-800">
                {caseData.resolution?.summary || 'The organization has completed their action on your request.'}
              </p>
              <p className="text-[11px] text-emerald-700">
                Please verify if your problem was solved satisfactorily. If yes, confirm and close to leave feedback. If not, you may dispute and reopen.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                isLoading={actionLoading}
                onClick={() =>
                  handleStatusTransition('REOPENED', 'Citizen disputed resolution within permitted window.')
                }
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
              >
                Dispute & Reopen
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() =>
                  handleStatusTransition('CLOSED', 'Citizen verified resolution and confirmed closure.')
                }
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Confirm & Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Closed & Feedback Section for CLOSED */}
      {caseData.status === 'CLOSED' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-sm font-semibold">Case Completed & Closed</CardTitle>
                  <CardDescription className="text-xs">
                    This request has been resolved and archived.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="resolved" size="sm">Resolution Verified</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {caseData.feedback ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Citizen Satisfaction Feedback:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= caseData.feedback!.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold font-mono ml-1.5 text-slate-800">
                      {caseData.feedback.rating} / 5
                    </span>
                  </div>
                </div>
                {caseData.feedback.comments && (
                  <p className="text-xs text-slate-600 italic">
                    "{caseData.feedback.comments}"
                  </p>
                )}
                <span className="text-[10px] text-slate-400 block text-right">
                  Submitted {new Date(caseData.feedback.submittedAt).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 block mb-1.5">
                    How satisfied are you with the resolution of your request?
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= feedbackRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-700 ml-2">
                      {feedbackRating === 5
                        ? 'Excellent (5/5)'
                        : feedbackRating === 4
                        ? 'Good (4/5)'
                        : feedbackRating === 3
                        ? 'Satisfactory (3/5)'
                        : feedbackRating === 2
                        ? 'Needs Improvement (2/5)'
                        : 'Poor (1/5)'}
                    </span>
                  </div>
                </div>
                <div>
                  <textarea
                    rows={2}
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    placeholder="Optional: Share feedback about your experience, response speed, or technician performance..."
                    className="w-full text-xs p-2.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingFeedback}
                >
                  Submit Rating & Review
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Case Details & Structured Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline & Messaging */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-700" />
                <CardTitle>Case Timeline & Audit History</CardTitle>
              </div>
              <CardDescription>
                Chronological record of every action, status transition, and response between you and the organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {caseData.timeline && caseData.timeline.length > 0 ? (
                  caseData.timeline.map((item) => {
                    const isCitizen = item.actorRole === 'CITIZEN';
                    const isSystem = item.actorRole === 'SYSTEM';
                    const isReadByOrg = item.readBy?.some(
                      (r) => r.role === 'ORGANIZATION_AGENT' || r.role === 'ORGANIZATION_ADMIN'
                    );

                    return (
                      <div
                        key={item._id}
                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                          isCitizen
                            ? 'bg-slate-50 border-slate-200'
                            : isSystem
                            ? 'bg-blue-50/50 border-blue-200'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCitizen ? (
                              <User className="w-3.5 h-3.5 text-slate-700" />
                            ) : isSystem ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span className="font-bold text-slate-900">{item.actorName}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                              {item.eventType.replace('_', ' ')}
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

                        {/* Read Receipt Tracker */}
                        {isCitizen && item.eventType === 'MESSAGE' && (
                          <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400 mt-1">
                            {isReadByOrg ? (
                              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Read by Organization
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Check className="w-3.5 h-3.5" />
                                Delivered
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No timeline events recorded.</p>
                )}
              </div>

              {/* Citizen Reply Composer */}
              {caseData.status !== 'CLOSED' && caseData.status !== 'CANCELLED' && (
                <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Transmit Direct Message or Reply to Organization:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>{showAttachmentInput ? 'Remove Attachment' : 'Add Attachment'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    required
                    placeholder="Type official reply, additional evidence, or inquiry..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />

                  {showAttachmentInput && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">Attachment Name</label>
                        <input
                          type="text"
                          placeholder="e.g. invoice_receipt.pdf"
                          value={attachmentName}
                          onChange={(e) => setAttachmentName(e.target.value)}
                          className="w-full border rounded p-1.5 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">Attachment URL / Link</label>
                        <input
                          type="url"
                          placeholder="https://storage.cpet.org/receipt.pdf"
                          value={attachmentUrl}
                          onChange={(e) => setAttachmentUrl(e.target.value)}
                          className="w-full border rounded p-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={sendingMsg}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Send Message
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with SLA & Structured Specs */}
        <div className="space-y-4">
          {/* Destination & Deterministic Routing Info Card */}
          {caseData.routing && (
            <Card className="border-indigo-100 bg-indigo-50/20">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Service Routing & Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-500">Destination Type:</span>
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
                  <span className="text-slate-500">Destination Queue:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[160px]">
                    {caseData.routing.destinationValue}
                  </span>
                </div>
                {caseData.externalDispatch && (
                  <div className="flex justify-between py-1 border-b border-indigo-100">
                    <span className="text-slate-500">Dispatch Status:</span>
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

          {/* Enhanced Multi-Milestone SLA & Escalation Dashboard */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-900">
                  <Clock className="w-4 h-4 text-slate-700" />
                  SLA & Escalation Status
                </CardTitle>
                <Badge
                  variant={
                    caseData.sla?.status === 'MET'
                      ? 'resolved'
                      : caseData.sla?.status === 'BREACHED' || caseData.sla?.isEscalated
                      ? 'critical'
                      : caseData.sla?.status === 'AT_RISK'
                      ? 'escalated'
                      : 'progress'
                  }
                  size="sm"
                >
                  {caseData.sla?.status || 'ON_TRACK'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Benchmark SLA:</span>
                <span className="font-semibold text-slate-900">
                  {caseData.sla?.slaHours || 48} Hours
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Resolution Window:</span>
                <span className="font-semibold">{formatSla(caseData.sla?.resolutionDueAt || caseData.sla?.dueAt)}</span>
              </div>

              {/* Acknowledgement Milestone */}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Acknowledgement:</span>
                {caseData.sla?.acknowledgedAt ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {new Date(caseData.sla.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-slate-700">
                    {caseData.sla?.acknowledgementDueAt ? formatSla(caseData.sla.acknowledgementDueAt) : 'Within 4h'}
                  </span>
                )}
              </div>

              {/* First Response Milestone */}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">First Response:</span>
                {caseData.sla?.firstRespondedAt ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {new Date(caseData.sla.firstRespondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-slate-700">
                    {caseData.sla?.firstResponseDueAt ? formatSla(caseData.sla.firstResponseDueAt) : 'Within 8h'}
                  </span>
                )}
              </div>

              {/* Escalation Hierarchy Details */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                    Escalation Level
                  </span>
                  {caseData.sla?.isEscalated ? (
                    <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3 text-red-500 animate-pulse" />
                      Active Escalation
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Standard Tier</span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                  <div className="text-xs font-semibold text-slate-900">
                    {caseData.sla?.currentEscalationTier || 'Tier 1: Frontline Operations Desk'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {caseData.routing?.department
                      ? `Assigned: ${caseData.routing.department}`
                      : 'Auto-escalates sequentially if SLA thresholds are breached.'}
                  </p>
                </div>

                {/* Escalation History */}
                {caseData.sla?.escalationHistory && caseData.sla.escalationHistory.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Escalation History
                    </span>
                    {caseData.sla.escalationHistory.map((hist, idx) => (
                      <div key={idx} className="bg-amber-50/60 border border-amber-200/70 rounded p-2 text-[11px] text-amber-950 space-y-0.5">
                        <div className="font-bold flex justify-between">
                          <span>{hist.tier}</span>
                          <span className="text-[10px] font-normal text-amber-700">
                            {new Date(hist.escalatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-800 leading-tight">{hist.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Structured Data Specs */}
          {caseData.structuredData && Object.keys(caseData.structuredData).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Case Specifications</CardTitle>
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

          {/* Location details */}
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
        </div>
      </div>
    </div>
  );
};
