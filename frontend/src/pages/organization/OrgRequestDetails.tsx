import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  User,
  Building2,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  Tag,
  MapPin,
  Phone,
  Mail,
  Lock,
  Globe,
  Sparkles,
  UserCheck,
  Briefcase,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { getSocket, joinCaseRoom, leaveCaseRoom } from '../../services/socket.js';

interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  actor: string;
  detail?: string;
  iconType: 'created' | 'assigned' | 'update' | 'message' | 'status';
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
  isInternal?: boolean;
}

const DEFAULT_TIMELINE: TimelineEvent[] = [
  {
    id: 't-1',
    title: 'Request Created',
    time: 'Apr 16, 10:24 AM',
    actor: 'by Citizen',
    iconType: 'created',
  },
  {
    id: 't-2',
    title: 'Assigned to Water Supply Dept',
    time: 'Apr 16, 10:55 AM',
    actor: 'by System',
    iconType: 'assigned',
  },
  {
    id: 't-3',
    title: 'Organization Update',
    time: 'Apr 16, 11:20 AM',
    actor: 'Technical team checking the issue',
    iconType: 'update',
  },
  {
    id: 't-4',
    title: 'Citizen Message',
    time: 'Apr 16, 12:05 PM',
    actor: 'Any update on the repair?',
    iconType: 'message',
  },
  {
    id: 't-5',
    title: 'Status Changed to In Progress',
    time: 'Apr 16, 12:30 PM',
    actor: 'by Organization',
    iconType: 'status',
  },
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  { id: 'm-1', sender: 'Dev Citizen', text: 'Low water pressure and muddy water in pipeline since morning.', time: '10:24 AM', isSelf: false },
  { id: 'm-2', sender: 'CPET Smart Routing', text: 'Case routed to Water Supply Department. SLA active: 4 hours.', time: '10:55 AM', isSelf: false, isInternal: true },
  { id: 'm-3', sender: 'Medha Sri Varsha', text: 'Field team has been dispatched to check main valve in Ward 4.', time: '11:20 AM', isSelf: true },
  { id: 'm-4', sender: 'Dev Citizen', text: 'Any update on the repair? We need water for household by evening.', time: '12:05 PM', isSelf: false },
];

const QUICK_RESPONSES = [
  'Field technician dispatched for on-site inspection.',
  'Checking with engineering team. Will update within 30 mins.',
  'Please provide a clear photo or landmark of the issue.',
  'Repair work completed. Please verify if resolved.',
];

export const OrgRequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'timeline' | 'communication' | 'details'>('timeline');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(DEFAULT_TIMELINE);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState<string>('In Progress');

  // Dynamic Case Info
  const [caseRef, setCaseRef] = useState(
    id?.startsWith('mock-') ? id.replace('mock-', 'CPET-2026-') : 'CPET-2026-1043'
  );
  const [caseTitle, setCaseTitle] = useState('Water Supply Issue');
  const [departmentName, setDepartmentName] = useState('Water Supply Department');
  const [citizenName, setCitizenName] = useState('Dev Citizen');
  const [citizenPhone, setCitizenPhone] = useState('+91 94940 12345');
  const [citizenEmail, setCitizenEmail] = useState('citizen@cpet.org');
  const [locationAddress, setLocationAddress] = useState('Ward 4, Rajahmundry East');
  const [slaTimeRemaining, setSlaTimeRemaining] = useState('4 Hours Target (2h Remaining)');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});

  // Team Member Work Assignment State
  const [assignedAgentId, setAssignedAgentId] = useState<string>('');
  const [assignedAgentName, setAssignedAgentName] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string; email: string }>>([]);
  const [selectedAgentForAssign, setSelectedAgentForAssign] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateMsg, setStatusUpdateMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Organization Team Roster for Assignment
  useEffect(() => {
    async function loadTeam() {
      if (!user?.organizationId) return;
      try {
        const res = await fetch(`/api/v1/organizations/${user.organizationId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            const activeTeam = json.data.filter((m: any) => m.isActive);
            setTeamMembers(activeTeam);
            if (activeTeam.length > 0 && !selectedAgentForAssign) {
              setSelectedAgentForAssign(activeTeam[0].id || activeTeam[0]._id);
            }
          }
        }
      } catch (err) {
        console.warn('Notice loading organization team for assignment:', err);
      }
    }
    loadTeam();
  }, [user, token, selectedAgentForAssign]);

  const fetchCaseDetails = useCallback(async () => {
    if (!id || id.startsWith('mock-')) return;

    try {
      const res = await fetch(`/api/v1/cases/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (!data) return;

        if (data.referenceNumber) setCaseRef(data.referenceNumber);
        if (data.title) setCaseTitle(data.title);
        if (data.category) setDepartmentName(`${data.category} Department`);
        if (data.structuredData) setFormAnswers(data.structuredData);

        if (data.assignedAgentId) {
          const agentIdStr = typeof data.assignedAgentId === 'object' ? data.assignedAgentId._id : data.assignedAgentId;
          setAssignedAgentId(agentIdStr);
          setAssignedAgentName(data.assignedAgentName || (typeof data.assignedAgentId === 'object' ? data.assignedAgentId.name : 'Assigned Agent'));
        } else if (data.assignedAgentName) {
          setAssignedAgentName(data.assignedAgentName);
        }

        if (data.requesterId && typeof data.requesterId === 'object') {
          if (data.requesterId.name) setCitizenName(data.requesterId.name);
          if (data.requesterId.email) setCitizenEmail(data.requesterId.email);
          if (data.requesterId.phone) setCitizenPhone(data.requesterId.phone);
        } else if (data.requesterName) {
          setCitizenName(data.requesterName);
          if (data.requesterEmail) setCitizenEmail(data.requesterEmail);
          if (data.requesterPhone) setCitizenPhone(data.requesterPhone);
        }

        if (data.sla?.slaHours) {
          setSlaTimeRemaining(`${data.sla.slaHours} Hours SLA Target`);
        }

        if (data.location?.address) {
          setLocationAddress(`${data.location.address}, ${data.location.city || ''}`);
        } else if (data.location?.city) {
          setLocationAddress(data.location.city);
        }

        // Map status
        if (data.status === 'IN_PROGRESS' || data.status === 'ASSIGNED') setStatus('In Progress');
        else if (data.status === 'WAITING_FOR_USER' || data.status === 'WAITING_FOR_ORGANIZATION') setStatus('Pending');
        else if (data.status === 'RESOLVED' || data.status === 'CLOSED') setStatus('Resolved');
        else if (data.status === 'SUBMITTED' || data.status === 'ACKNOWLEDGED') setStatus('New');
        else if (data.status === 'ESCALATED') setStatus('Escalated');

        // Map timeline & messages from events
        if (data.timeline && Array.isArray(data.timeline) && data.timeline.length > 0) {
          const eventsList: TimelineEvent[] = data.timeline.map((evt: any, idx: number) => {
            const timeStr = new Date(evt.timestamp || evt.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = new Date(evt.timestamp || evt.createdAt || Date.now()).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            let iconType: TimelineEvent['iconType'] = 'update';
            if (evt.eventType === 'CASE_CREATED') iconType = 'created';
            else if (evt.eventType === 'STATUS_CHANGE') iconType = 'status';
            else if (evt.eventType === 'MESSAGE') iconType = evt.actorRole === 'CITIZEN' ? 'message' : 'update';
            else if (evt.eventType === 'ASSIGNED') iconType = 'assigned';

            return {
              id: evt._id || `t-${idx}`,
              title: evt.eventType === 'CASE_CREATED' ? 'Request Created' : evt.message || 'Status Updated',
              time: `${dateStr}, ${timeStr}`,
              actor: `by ${evt.actorName || evt.actorRole || 'System'}`,
              iconType,
            };
          });
          setTimelineEvents(eventsList);

          const chatList: ChatMessage[] = data.timeline
            .filter((evt: any) => evt.message && (evt.eventType === 'MESSAGE' || evt.eventType === 'INFO_PROVIDED' || evt.eventType === 'INFO_REQUESTED' || evt.eventType === 'CASE_CREATED'))
            .map((evt: any, idx: number) => {
              const isSelf = evt.actorRole === 'ORGANIZATION_ADMIN' || evt.actorRole === 'ORGANIZATION_AGENT' || evt.actorName === user?.name;
              return {
                id: evt._id || `m-${idx}`,
                sender: evt.actorName || (evt.actorRole === 'CITIZEN' ? 'Citizen' : 'Support Specialist'),
                text: evt.message,
                time: new Date(evt.timestamp || evt.createdAt || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                isSelf,
                isInternal: Boolean(evt.isInternal),
              };
            });
          if (chatList.length > 0) {
            setMessages(chatList);
          }
        }
      }
    } catch (err) {
      console.warn('Using default workbench mock dataset', err);
    }
  }, [id, token, user?.name]);

  // WebSocket Live Real-Time 2-Way Sync
  useEffect(() => {
    fetchCaseDetails();

    if (id && !id.startsWith('mock-')) {
      joinCaseRoom(id);
      setIsLiveConnected(true);
      const socket = getSocket(token);

      const handleLiveMessage = (payload: any) => {
        const evt = payload.message || payload;
        const msgText = evt.message || evt.text;
        if (!msgText) return;

        const isSelf =
          evt.actorRole === 'ORGANIZATION_ADMIN' ||
          evt.actorRole === 'ORGANIZATION_AGENT' ||
          evt.actorName === user?.name;

        const newMsg: ChatMessage = {
          id: evt._id || evt.id || `live-${Date.now()}`,
          sender: evt.actorName || (isSelf ? user?.name || 'You' : citizenName),
          text: msgText,
          time: new Date(evt.timestamp || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isSelf,
          isInternal: Boolean(evt.isInternal),
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Also append to timeline
        const newTimeItem: TimelineEvent = {
          id: `t-live-${Date.now()}`,
          title: evt.isInternal ? 'Internal Department Note' : `${evt.actorName || 'Citizen'} Message`,
          time: `Today, ${newMsg.time}`,
          actor: msgText,
          iconType: evt.isInternal ? 'status' : isSelf ? 'update' : 'message',
        };
        setTimelineEvents((prev) => [...prev, newTimeItem]);
      };

      const handleStatusUpdate = (payload: any) => {
        if (payload.status) {
          if (payload.status === 'IN_PROGRESS') setStatus('In Progress');
          else if (payload.status === 'WAITING_FOR_USER') setStatus('Pending');
          else if (payload.status === 'RESOLVED') setStatus('Resolved');
          else if (payload.status === 'SUBMITTED') setStatus('New');
        }
      };

      socket.on('case:new_message', handleLiveMessage);
      socket.on('case:message', handleLiveMessage);
      socket.on('case:status_changed', handleStatusUpdate);
      socket.on('case:updated', handleStatusUpdate);

      return () => {
        socket.off('case:new_message', handleLiveMessage);
        socket.off('case:message', handleLiveMessage);
        socket.off('case:status_changed', handleStatusUpdate);
        socket.off('case:updated', handleStatusUpdate);
        leaveCaseRoom(id);
      };
    }
  }, [id, token, fetchCaseDetails, citizenName, user?.name]);

  useEffect(() => {
    if (activeTab === 'communication') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || chatInput).trim();
    if (!textToSend) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append to local chat
    const localMsg: ChatMessage = {
      id: `m-local-${Date.now()}`,
      sender: user?.name || 'Support Officer',
      text: textToSend,
      time: timeString,
      isSelf: true,
      isInternal,
    };
    setMessages((prev) => [...prev, localMsg]);

    // 2. Append to timeline
    const newTimelineItem: TimelineEvent = {
      id: `t-local-${Date.now()}`,
      title: isInternal ? 'Internal Department Note' : 'Organization Update',
      time: `Today, ${timeString}`,
      actor: textToSend,
      iconType: isInternal ? 'status' : 'update',
    };
    setTimelineEvents((prev) => [...prev, newTimelineItem]);

    setChatInput('');

    // 3. Post to backend API
    if (id && !id.startsWith('mock-')) {
      try {
        await fetch(`/api/v1/cases/${id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: textToSend,
            isInternal,
          }),
        });
      } catch (err) {
        console.warn('API message sync fallback', err);
      }
    } else {
      // Mock mode: simulate citizen reply if not internal note
      if (!isInternal) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `citizen-reply-${Date.now()}`,
              sender: 'Dev Citizen',
              text: 'Understood. Thank you for the update! Looking forward to the resolution.',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSelf: false,
            },
          ]);
        }, 1500);
      }
    }
  };

  const handleStatusChange = async (newStatusText: string) => {
    setIsUpdatingStatus(true);
    setStatus(newStatusText);

    let targetStatus: string = 'IN_PROGRESS';
    if (newStatusText === 'New') targetStatus = 'SUBMITTED';
    else if (newStatusText === 'In Progress') targetStatus = 'IN_PROGRESS';
    else if (newStatusText === 'Pending') targetStatus = 'WAITING_FOR_USER';
    else if (newStatusText === 'Escalated') targetStatus = 'ESCALATED';
    else if (newStatusText === 'Resolved') targetStatus = 'RESOLVED';

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTimelineEvents((prev) => [
      ...prev,
      {
        id: `t-status-${Date.now()}`,
        title: `Status Changed to ${newStatusText}`,
        time: `Today, ${timeString}`,
        actor: `by ${user?.name || 'Organization Staff'}`,
        iconType: 'status',
      },
    ]);

    if (id && !id.startsWith('mock-')) {
      try {
        const res = await fetch(`/api/v1/cases/${id}/transition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetStatus,
            message: `Status transitioned to ${newStatusText} by ${user?.name || 'Support Agent'}`,
          }),
        });

        if (res.ok) {
          setStatusUpdateMsg(`Case status successfully updated to "${newStatusText}"`);
          setTimeout(() => setStatusUpdateMsg(null), 3000);
          await fetchCaseDetails();
        } else {
          const errJson = await res.json().catch(() => ({}));
          console.warn('Status transition error response', errJson);
          setStatusUpdateMsg(errJson.error?.message || `Status updated locally to "${newStatusText}"`);
          setTimeout(() => setStatusUpdateMsg(null), 3000);
        }
      } catch (err) {
        console.warn('Status transition API notice', err);
      } finally {
        setIsUpdatingStatus(false);
      }
    } else {
      setIsUpdatingStatus(false);
      setStatusUpdateMsg(`Case status updated to "${newStatusText}"`);
      setTimeout(() => setStatusUpdateMsg(null), 3000);
    }
  };

  const handleAssignAgent = async (agentIdToAssign: string) => {
    if (!agentIdToAssign) return;
    setIsAssigning(true);
    try {
      const selectedMember = teamMembers.find((m) => m.id === agentIdToAssign);
      const agentDisplayName = selectedMember ? selectedMember.name : 'Team Specialist';

      if (id && !id.startsWith('mock-')) {
        const res = await fetch(`/api/v1/cases/${id}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            agentId: agentIdToAssign,
            notes: `Assigned case to ${agentDisplayName} for direct resolution`,
          }),
        });

        if (res.ok) {
          setAssignedAgentId(agentIdToAssign);
          setAssignedAgentName(agentDisplayName);
          setStatus('In Progress');
          setStatusUpdateMsg(`Work assigned to ${agentDisplayName}!`);
          setTimeout(() => setStatusUpdateMsg(null), 3000);
          fetchCaseDetails();
        }
      } else {
        setAssignedAgentId(agentIdToAssign);
        setAssignedAgentName(agentDisplayName);
        setStatus('In Progress');
        setStatusUpdateMsg(`Work assigned to ${agentDisplayName}!`);
        setTimeout(() => setStatusUpdateMsg(null), 3000);

        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTimelineEvents((prev) => [
          ...prev,
          {
            id: `t-assign-${Date.now()}`,
            title: `Assigned to ${agentDisplayName}`,
            time: `Today, ${timeString}`,
            actor: `by ${user?.name || 'Administrator'}`,
            iconType: 'assigned',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to assign work', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const getTimelineIcon = (type: TimelineEvent['iconType']) => {
    switch (type) {
      case 'created':
        return <FileText className="w-4 h-4 text-white" />;
      case 'assigned':
        return <Building2 className="w-4 h-4 text-white" />;
      case 'update':
        return <MessageSquare className="w-4 h-4 text-white" />;
      case 'message':
        return <User className="w-4 h-4 text-white" />;
      case 'status':
        return <CheckCircle2 className="w-4 h-4 text-white" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-4 pb-28 select-none font-sans text-slate-800 relative min-h-[90vh]">
      
      {/* 1. Top Header: Back Arrow + Title */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/organization/requests')}
            aria-label="Back to request queue"
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
            Case Workbench
          </h1>
        </div>

        {/* Live Socket Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
          <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`} />
          <span>{isLiveConnected ? '2-Way Live' : 'Connected'}</span>
        </div>
      </div>

      {/* Status Update Toast Alert */}
      {statusUpdateMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-800 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusUpdateMsg}</span>
          </div>
          <button
            onClick={() => setStatusUpdateMsg(null)}
            aria-label="Dismiss alert"
            className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Hero Summary Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[2px] shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" className="opacity-20" />
                <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
              </svg>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#1E293B] tracking-tight truncate">
              {caseRef}
            </h2>
            <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
              {caseTitle}
            </p>
            <p className="text-[11px] text-slate-400 font-normal truncate">
              Citizen: {citizenName} ({citizenPhone})
            </p>
          </div>
        </div>

        {/* Interactive Status Selector on Top Right */}
        <div className="relative shrink-0">
          <select
            value={status}
            disabled={isUpdatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
              status === 'Resolved'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : status === 'Escalated'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : status === 'New'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-[#FFF9EE] text-[#D97706] border-amber-300'
            }`}
          >
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
        </div>
      </div>

      {/* 3. Segmented Navigation Tabs: Timeline | Communication | Details */}
      <div className="flex items-center border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center relative transition-colors cursor-pointer ${
            activeTab === 'timeline' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Timeline</span>
          {activeTab === 'timeline' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('communication')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center relative transition-colors cursor-pointer ${
            activeTab === 'communication' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="inline-flex items-center gap-1.5">
            <span>Communication</span>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          </div>
          {activeTab === 'communication' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center relative transition-colors cursor-pointer ${
            activeTab === 'details' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Details</span>
          {activeTab === 'details' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
          )}
        </button>
      </div>

      {/* 4. Tab 1: Timeline Content */}
      {activeTab === 'timeline' && (
        <div className="pt-2 px-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500">Activity & Audit Timeline</span>
            <button
              type="button"
              onClick={() => setActiveTab('communication')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Open Live Chat →
            </button>
          </div>

          <div className="relative pl-6 space-y-6">
            <div className="absolute top-4 bottom-4 left-[15px] w-0.5 bg-[#2563EB]" />

            {timelineEvents.map((evt) => (
              <div key={evt.id} className="relative flex items-start gap-4">
                <div className="relative z-10 w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                  {getTimelineIcon(evt.iconType)}
                </div>

                <div className="min-w-0 pt-0.5 space-y-0.5">
                  <div className="text-xs sm:text-sm font-black text-[#1E293B]">
                    {evt.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {evt.time}
                  </div>
                  <div className="text-xs text-slate-500 font-normal">
                    {evt.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: 2-Way Communication Chat */}
      {activeTab === 'communication' && (
        <div className="space-y-3 pt-2">
          {/* Chat Mode Control Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Direct Citizen Chat</span>
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {citizenName} Active
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsInternal(!isInternal)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                isInternal
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isInternal ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              <span>{isInternal ? 'Internal Note Mode' : 'Public Citizen Reply'}</span>
            </button>
          </div>

          {/* Quick Response Chips */}
          <div className="space-y-1.5 px-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>Quick Response Templates</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_RESPONSES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(undefined, tmpl)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-semibold whitespace-nowrap transition-colors border border-slate-200/70 cursor-pointer shrink-0"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] text-slate-400 font-semibold mb-1 px-1 flex items-center gap-1.5">
                  <span className={m.isSelf ? 'text-blue-600 font-bold' : 'text-slate-700 font-bold'}>
                    {m.sender}
                  </span>
                  <span>•</span>
                  <span>{m.time}</span>
                  {m.isInternal && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
                      INTERNAL NOTE
                    </span>
                  )}
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    m.isInternal
                      ? 'bg-amber-50/95 text-amber-900 border border-amber-200 rounded-br-xs'
                      : m.isSelf
                      ? 'bg-[#2563EB] text-white rounded-br-xs shadow-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Ticket Breakdown */}
      {activeTab === 'details' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-semibold">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Department</span>
              </div>
              <span className="font-extrabold text-[#1E293B]">{departmentName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>SLA Resolution Window</span>
              </div>
              <span className="font-extrabold text-amber-600">{slaTimeRemaining}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Incident Location</span>
              </div>
              <span className="font-extrabold text-[#1E293B]">{locationAddress}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-semibold">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>Citizen Contact</span>
              </div>
              <span className="font-bold text-slate-800">{citizenPhone} ({citizenName})</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-semibold">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Citizen Email</span>
              </div>
              <span className="font-bold text-blue-600">{citizenEmail}</span>
            </div>
          </div>

          {/* Submitted Dynamic Form Questionnaire Answers */}
          {Object.keys(formAnswers).length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Submitted Form Questionnaire
                </span>
                {formAnswers.formTitle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                    {formAnswers.formTitle}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(formAnswers)
                  .filter(([k]) => !['formId', 'formTitle', 'formCategory', 'department', 'submittedVia'].includes(k))
                  .map(([key, val]: any, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 break-words">
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Work Assignment Section (Admin controls work allocation) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Assigned Team Member</span>
              </div>
              {assignedAgentName ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  {assignedAgentName}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Unassigned (General Queue)
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <select
                  value={selectedAgentForAssign || assignedAgentId}
                  onChange={(e) => {
                    setSelectedAgentForAssign(e.target.value);
                    setAssignedAgentId(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                >
                  <option value="" disabled>Select active team member...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={isAssigning || !selectedAgentForAssign}
                onClick={() => handleAssignAgent(selectedAgentForAssign)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isAssigning ? 'Assigning...' : 'Assign Work'}</span>
              </button>
            </div>

            {statusUpdateMsg && (
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{statusUpdateMsg}</span>
              </div>
            )}
          </div>

          <div className="pt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">Change Case Status</label>
              <span className="text-[10px] text-slate-500 font-medium">Click to transition status</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['New', 'In Progress', 'Pending', 'Escalated', 'Resolved'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(s)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center disabled:opacity-50 ${
                    status === s
                      ? s === 'Resolved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : s === 'Escalated'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : s === 'Pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {s === 'Pending' ? 'Pending Action' : s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Bottom Sticky Bar: Message Input + Blue Send Button */}
      <form
        onSubmit={handleSendMessage}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-3 z-30 shadow-lg"
      >
        <div className="max-w-md md:max-w-xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isInternal ? 'Write internal note (not visible to citizen)...' : 'Type public reply to citizen...'}
            aria-label={isInternal ? 'Write internal note' : 'Type public reply to citizen'}
            className={`flex-1 px-4 py-3 border rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs ${
              isInternal
                ? 'bg-amber-50/70 border-amber-300 focus:ring-amber-500'
                : 'bg-slate-50 border-slate-200 focus:ring-blue-600'
            }`}
          />

          <button
            type="submit"
            aria-label="Send message"
            className="w-11 h-11 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-md shadow-blue-500/30 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

    </div>
  );
};
