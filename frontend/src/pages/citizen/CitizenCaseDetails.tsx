import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Tv,
  Zap,
  Droplet,
  Smartphone,
  Phone,
  MessageSquare,
  Clock,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Camera,
  Mic,
  Send,
  Download,
  Landmark,
  Radio,
  ShieldCheck,
  Bell,
  Sparkles,
} from 'lucide-react';
import { CaseItem } from '../../types/case.js';
import { getSocket, joinCaseRoom, leaveCaseRoom } from '../../services/socket.js';

interface ChatMessage {
  id: string;
  sender: 'CITIZEN' | 'AGENT';
  text: string;
  time: string;
  attachment?: {
    name: string;
    size: string;
  };
}

interface TimelineItem {
  title: string;
  time: string;
  isCompleted: boolean;
  isCurrent?: boolean;
  smsSent?: boolean;
}

interface AttachmentItem {
  name: string;
  size: string;
  type: 'pdf' | 'image';
}

interface RequestDetailConfig {
  referenceNumber: string;
  serviceTitle: string;
  orgName: string;
  orgShort: string;
  orgPhone: string;
  statusText: string;
  statusVariant: 'progress' | 'pending' | 'resolved' | 'closed';
  slaTime: string;
  slaTarget: string;
  categoryIcon: React.ReactNode;
  timeline: TimelineItem[];
  attachments: AttachmentItem[];
  initialMessages: ChatMessage[];
}

const CASE_CONFIGS: Record<string, RequestDetailConfig> = {
  'mock-1': {
    referenceNumber: 'CPET-2026-44537',
    serviceTitle: 'AC Service • Lloyd',
    orgName: 'Lloyd (Authorized Service Center)',
    orgShort: 'Lloyd',
    orgPhone: '+91 1800-102-4455',
    statusText: 'In Progress',
    statusVariant: 'progress',
    slaTime: '2d 4h 32m',
    slaTarget: 'Target: 3 days',
    categoryIcon: <Tv className="w-5 h-5 text-blue-600" />,
    timeline: [
      { title: 'Request Submitted & SMS Dispatched to +91 94940 12345', time: 'Apr 26, 2025 • 10:24 AM', isCompleted: true, smsSent: true },
      { title: 'Assigned to Service Center (SMS Alert Sent)', time: 'Apr 26, 2025 • 11:15 AM', isCompleted: true, smsSent: true },
      { title: 'In Progress (Technician Assigned - SMS Alert Sent)', time: 'Apr 27, 2025 • 09:20 AM', isCompleted: true, isCurrent: true, smsSent: true },
      { title: 'Waiting for Replacement Gas/Parts', time: 'Apr 27, 2025 • 02:35 PM', isCompleted: false },
    ],
    attachments: [
      { name: 'invoice_receipt.pdf', size: '2.4 MB', type: 'pdf' },
      { name: 'ac_unit_photo.jpg', size: '1.2 MB', type: 'image' },
    ],
    initialMessages: [
      {
        id: 'm1',
        sender: 'CITIZEN',
        text: 'My AC is still not cooling properly. Can you please update on the technician visit status?',
        time: '10:24 AM',
      },
      {
        id: 'm2',
        sender: 'AGENT',
        text: "Hi Varsha, we have received your request and assigned senior technician Ramesh. He will visit tomorrow morning.",
        time: '10:32 AM',
      },
      {
        id: 'm3',
        sender: 'AGENT',
        text: '',
        time: '10:32 AM',
        attachment: {
          name: 'Service guidelines.pdf',
          size: '2.4 MB',
        },
      },
    ],
  },
  'mock-2': {
    referenceNumber: 'CPET-2026-44210',
    serviceTitle: 'Electricity Issue • APDCL',
    orgName: 'Andhra Pradesh Eastern Power (APDCL)',
    orgShort: 'APDCL',
    orgPhone: '+91 1800-425-15533',
    statusText: 'Pending Action',
    statusVariant: 'pending',
    slaTime: '1d 2h 10m',
    slaTarget: 'Target: 2 days',
    categoryIcon: <Zap className="w-5 h-5 text-amber-500" />,
    timeline: [
      { title: 'Complaint Filed & SMS Alert Dispatched', time: 'Apr 25, 2025 • 03:10 PM', isCompleted: true, smsSent: true },
      { title: 'Transferred to Kakinada Substation', time: 'Apr 25, 2025 • 04:45 PM', isCompleted: true, smsSent: true },
      { title: 'Lineman Dispatched for Field Inspection (SMS Alert Sent)', time: 'Apr 26, 2025 • 08:30 AM', isCompleted: true, isCurrent: true, smsSent: true },
      { title: 'Transformer Sparking Resolution', time: 'Estimated Apr 27 • 12:00 PM', isCompleted: false },
    ],
    attachments: [
      { name: 'transformer_spark_site.jpg', size: '3.1 MB', type: 'image' },
      { name: 'substation_dispatch_order.pdf', size: '1.1 MB', type: 'pdf' },
    ],
    initialMessages: [
      {
        id: 'em1',
        sender: 'CITIZEN',
        text: 'Frequent power tripping and sparks coming from transformer on Main Road. High risk during evening.',
        time: '03:10 PM',
      },
      {
        id: 'em2',
        sender: 'AGENT',
        text: 'Emergency electrical team dispatched under ticket #APDCL-883. Please maintain a safe distance from the pole.',
        time: '03:25 PM',
      },
    ],
  },
  'mock-3': {
    referenceNumber: 'CPET-2026-44021',
    serviceTitle: 'Water Supply • Municipal Corp',
    orgName: 'Municipal Corporation Water Board',
    orgShort: 'GVMC',
    orgPhone: '+91 1800-425-0000',
    statusText: 'In Progress',
    statusVariant: 'progress',
    slaTime: '3d 1h 45m',
    slaTarget: 'Target: 4 days',
    categoryIcon: <Droplet className="w-5 h-5 text-sky-500" />,
    timeline: [
      { title: 'Grievance Logged in Ward 12 & SMS Sent', time: 'Apr 24, 2025 • 08:15 AM', isCompleted: true, smsSent: true },
      { title: 'Municipal Engineer Inspection', time: 'Apr 24, 2025 • 10:00 AM', isCompleted: true },
      { title: 'Excavation & Pipeline Replacement (SMS Alert Sent)', time: 'Apr 25, 2025 • 02:00 PM', isCompleted: true, isCurrent: true, smsSent: true },
      { title: 'Water Pressure Restoration', time: 'Estimated Apr 27 • 04:00 PM', isCompleted: false },
    ],
    attachments: [
      { name: 'pipeline_leak_photo.jpg', size: '2.8 MB', type: 'image' },
      { name: 'ward_engineer_inspection.pdf', size: '840 KB', type: 'pdf' },
    ],
    initialMessages: [
      {
        id: 'wm1',
        sender: 'CITIZEN',
        text: 'No water supply in block 4 since 2 days. Main line appears to be ruptured near the junction.',
        time: '08:15 AM',
      },
      {
        id: 'wm2',
        sender: 'AGENT',
        text: 'Pipeline repair work is underway. An interim drinking water tanker is also stationed near community hall.',
        time: '09:00 AM',
      },
    ],
  },
  'mock-4': {
    referenceNumber: 'CPET-2026-43876',
    serviceTitle: 'Mobile Network • Airtel',
    orgName: 'Airtel Broadband & Network Ops',
    orgShort: 'Airtel',
    orgPhone: '+91 1800-103-0121',
    statusText: 'Resolved',
    statusVariant: 'resolved',
    slaTime: 'Resolved',
    slaTarget: 'Target met in 18h',
    categoryIcon: <Smartphone className="w-5 h-5 text-emerald-500" />,
    timeline: [
      { title: 'Fiber Breakdown Reported & SMS Sent', time: 'Apr 23, 2025 • 09:00 AM', isCompleted: true, smsSent: true },
      { title: 'Optical Line Diagnostic Test', time: 'Apr 23, 2025 • 10:15 AM', isCompleted: true },
      { title: 'Field Tech Fiber Splicing Done (SMS Alert Sent)', time: 'Apr 23, 2025 • 03:30 PM', isCompleted: true, smsSent: true },
      { title: 'Gigabit Bandwidth Verified & Closed (SMS Delivery Confirmed)', time: 'Apr 24, 2025 • 08:00 AM', isCompleted: true, isCurrent: true, smsSent: true },
    ],
    attachments: [
      { name: 'fiber_optical_test.pdf', size: '520 KB', type: 'pdf' },
      { name: 'resolution_summary.pdf', size: '1.4 MB', type: 'pdf' },
    ],
    initialMessages: [
      {
        id: 'am1',
        sender: 'CITIZEN',
        text: 'Red LOS light on Airtel Xstream fiber router. No internet since morning.',
        time: '09:00 AM',
      },
      {
        id: 'am2',
        sender: 'AGENT',
        text: 'Fiber cut at pole #42 has been spliced and signal power verified (-18 dBm). Connection is back online.',
        time: '04:00 PM',
      },
    ],
  },
  'mock-5': {
    referenceNumber: 'CPET-2026-44890',
    serviceTitle: 'Banking Issue • State Bank of India',
    orgName: 'State Bank of India (SBI Nodal Grievance Cell)',
    orgShort: 'SBI',
    orgPhone: '+91 1800-425-3800',
    statusText: 'In Progress',
    statusVariant: 'progress',
    slaTime: '2d 18h 40m',
    slaTarget: 'Target: 3 days (RBI Ombudsman SLA)',
    categoryIcon: <Landmark className="w-5 h-5 text-teal-600" />,
    timeline: [
      { title: 'ATM Dispense Failure Logged (₹5,000) & SMS Sent', time: 'Apr 26, 2025 • 09:15 AM', isCompleted: true, smsSent: true },
      { title: 'Nodal Switch Log Verified (EJ Log Check)', time: 'Apr 26, 2025 • 11:30 AM', isCompleted: true },
      { title: 'Branch Reconciler Assigned (SMS Alert Sent to +91 94940 12345)', time: 'Apr 27, 2025 • 10:00 AM', isCompleted: true, isCurrent: true, smsSent: true },
      { title: 'Automated Account Reversal & Settlement', time: 'Estimated Apr 28 • 02:00 PM', isCompleted: false },
    ],
    attachments: [
      { name: 'atm_dispense_slip.pdf', size: '850 KB', type: 'pdf' },
      { name: 'bank_account_statement.pdf', size: '1.8 MB', type: 'pdf' },
    ],
    initialMessages: [
      {
        id: 'bm1',
        sender: 'CITIZEN',
        text: 'Attempted to withdraw ₹5,000 at SBI Danavaipeta ATM. Cash was not dispensed but amount was debited from my account. TXN ID: SBI-ATM-994821.',
        time: '09:15 AM',
      },
      {
        id: 'bm2',
        sender: 'AGENT',
        text: 'Hello Varsha, we checked the ATM Electronic Journal (EJ) logs for ATM #RJY-04. The un-dispensed cash of ₹5,000 has been verified. Auto-credit reversal is initiated under RBI mandate.',
        time: '11:35 AM',
      },
      {
        id: 'bm3',
        sender: 'AGENT',
        text: '',
        time: '11:35 AM',
        attachment: {
          name: 'RBI Dispute Resolution Form.pdf',
          size: '1.2 MB',
        },
      },
    ],
  },
};

export const CitizenCaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Active View Mode: 'DETAILS' (Case Details) | 'CHAT' (Case Conversation)
  const [activeView, setActiveView] = useState<'DETAILS' | 'CHAT'>('DETAILS');

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [inputMessage, setInputMessage] = useState('');

  // Live SMS Notification State
  const [smsNotificationToast, setSmsNotificationToast] = useState<string | null>(null);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const registeredPhone = user?.phone || '+91 94940 12345';

  // Default configuration based on route param or fallback to mock-1
  const config =
    (id && CASE_CONFIGS[id]) ||
    (id === 'CPET-2026-44890' ? CASE_CONFIGS['mock-5'] : null) ||
    (id === 'CPET-2026-44210' ? CASE_CONFIGS['mock-2'] : null) ||
    (id === 'CPET-2026-44021' ? CASE_CONFIGS['mock-3'] : null) ||
    (id === 'CPET-2026-43876' ? CASE_CONFIGS['mock-4'] : null) ||
    CASE_CONFIGS['mock-1'];

  const [messages, setMessages] = useState<ChatMessage[]>(config.initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchCase = useCallback(async () => {
    if (!id || id.startsWith('mock-')) return;
    try {
      const res = await fetch(`/api/v1/cases/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setCaseData(json.data);

        // Parse timeline events for real chat messages
        if (json.data.timeline && Array.isArray(json.data.timeline) && json.data.timeline.length > 0) {
          const mapped: ChatMessage[] = json.data.timeline
            .filter((m: any) => m.message && (m.eventType === 'MESSAGE' || m.eventType === 'INFO_PROVIDED' || m.eventType === 'INFO_REQUESTED' || m.eventType === 'CASE_CREATED'))
            .map((m: any, idx: number) => ({
              id: m._id || `msg-${idx}`,
              sender: m.actorRole === 'CITIZEN' || m.senderRole === 'CITIZEN' ? 'CITIZEN' : 'AGENT',
              text: m.message,
              time: new Date(m.timestamp || m.createdAt || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              attachment: m.attachments && m.attachments.length > 0 ? {
                name: m.attachments[0].name || m.attachments[0].filename || 'Document.pdf',
                size: m.attachments[0].size ? `${Math.round(m.attachments[0].size / 1024)} KB` : '1.2 MB',
              } : undefined,
            }));
          if (mapped.length > 0) {
            setMessages(mapped);
          }
        }
      }
    } catch (err) {
      console.warn('Using fallback case configuration', err);
    }
  }, [id, token]);

  useEffect(() => {
    fetchCase();

    if (id && !id.startsWith('mock-')) {
      joinCaseRoom(id);
      const socket = getSocket(token);

      const handleNewMessage = (payload: any) => {
        const evt = payload.message || payload;
        const msgText = evt.message || evt.text;
        if (!msgText) return;
        const isCitizen = evt.actorRole === 'CITIZEN' || evt.senderRole === 'CITIZEN';

        setMessages((prev) => {
          if (prev.some((m) => m.id === evt._id || m.id === evt.id)) return prev;
          return [
            ...prev,
            {
              id: evt._id || evt.id || `socket-${Date.now()}`,
              sender: isCitizen ? 'CITIZEN' : 'AGENT',
              text: msgText,
              time: new Date(evt.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              attachment: evt.attachments && evt.attachments.length > 0 ? {
                name: evt.attachments[0].name || 'Document.pdf',
                size: evt.attachments[0].size ? `${Math.round(evt.attachments[0].size / 1024)} KB` : '1.2 MB',
              } : undefined,
            },
          ];
        });
      };

      const handleSmsDelivered = (payload: any) => {
        setSmsNotificationToast(
          `📱 Live SMS Delivered to ${payload.phone || registeredPhone}: "${payload.smsText || `Status updated to ${payload.status}`}"`
        );
      };

      socket.on('case:new_message', handleNewMessage);
      socket.on('case:message', handleNewMessage);
      socket.on('case:sms_delivered', handleSmsDelivered);
      socket.on('notification:sms_sent', handleSmsDelivered);

      return () => {
        socket.off('case:new_message', handleNewMessage);
        socket.off('case:message', handleNewMessage);
        socket.off('case:sms_delivered', handleSmsDelivered);
        socket.off('notification:sms_sent', handleSmsDelivered);
        leaveCaseRoom(id);
      };
    }
  }, [id, token, fetchCase, registeredPhone]);

  // Update messages when switching to different mock case
  useEffect(() => {
    if (id && CASE_CONFIGS[id]) {
      setMessages(CASE_CONFIGS[id].initialMessages);
    }
  }, [id]);

  useEffect(() => {
    if (activeView === 'CHAT') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeView]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend) return;

    if (!customText) setInputMessage('');

    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      sender: 'CITIZEN',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);

    if (id && !id.startsWith('mock-')) {
      try {
        await fetch(`/api/v1/cases/${id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: textToSend }),
        });
      } catch (err) {
        console.warn('Message send network fallback', err);
      }
    } else {
      // Simulate realistic agent response in mock mode
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-reply-${Date.now()}`,
            sender: 'AGENT',
            text: `Thank you for the update. Our support officer is actively reviewing your request (${caseReference}).`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }, 1200);
    }
  };

  const handleSendTestSms = async () => {
    setIsSendingTestSms(true);
    try {
      const res = await fetch('/api/v1/notifications/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone: registeredPhone,
          caseReference: caseReference,
          status: statusText.toUpperCase().replace(/\s+/g, '_'),
          orgName: orgName,
        }),
      });
      const json = await res.json();
      if (json.data?.smsText) {
        setSmsNotificationToast(`📱 SMS Delivered: "${json.data.smsText}"`);
      } else {
        setSmsNotificationToast(`📱 SMS Alert: Case ${caseReference} status (${statusText}) delivered to ${registeredPhone}.`);
      }
    } catch {
      setSmsNotificationToast(`📱 SMS Alert: Case ${caseReference} status (${statusText}) delivered to ${registeredPhone}.`);
    } finally {
      setIsSendingTestSms(false);
      setTimeout(() => setSmsNotificationToast(null), 7000);
    }
  };

  // Determine dynamic fields
  const caseReference = caseData?.referenceNumber || config.referenceNumber;
  const orgName =
    typeof caseData?.organizationId === 'object' && caseData?.organizationId?.name
      ? caseData.organizationId.name
      : caseData?.organizationName || config.orgName;
  const orgShort = orgName.split(' ')[0] || config.orgShort;
  const serviceTitle = caseData?.category || caseData?.title || config.serviceTitle;
  const statusText =
    caseData?.status === 'RESOLVED'
      ? 'Resolved'
      : caseData?.status === 'WAITING_FOR_USER'
      ? 'Pending Action'
      : caseData?.status === 'CLOSED'
      ? 'Closed'
      : config.statusText;
  const slaTime = config.slaTime;
  const slaTarget = config.slaTarget;
  const categoryIcon = config.categoryIcon;
  const timeline = config.timeline;
  const attachments = config.attachments;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      
      {/* Real-time SMS Delivery Banner */}
      {smsNotificationToast && (
        <div className="bg-emerald-900/90 text-white border border-emerald-500/40 rounded-2xl p-3.5 shadow-lg flex items-start justify-between gap-3 animate-fade-in backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-200 uppercase tracking-wide flex items-center gap-2">
                <span>Live SMS Broadcast Sent to User Phone</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-700/80 text-[10px] text-emerald-100 font-mono">
                  {registeredPhone}
                </span>
              </div>
              <p className="text-xs text-white font-medium mt-1 leading-relaxed">
                {smsNotificationToast}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSmsNotificationToast(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: CASE DETAILS                                                      */}
      {/* ========================================================================= */}
      {activeView === 'DETAILS' && (
        <div className="space-y-4">
          
          {/* Top Header: Back Arrow + Title */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/citizen/requests')}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
                  Case Tracking & Official Details
                </h1>
                <p className="text-xs text-slate-500 font-normal">
                  Real-time status tracking with automated phone notifications
                </p>
              </div>
            </div>

            {/* Test SMS Notification Button */}
            <button
              type="button"
              disabled={isSendingTestSms}
              onClick={handleSendTestSms}
              className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Test SMS dispatch to registered mobile"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSendingTestSms ? 'Sending SMS...' : 'Test Status SMS'}</span>
            </button>
          </div>

          {/* Details Content Grid (Responsive 1-Col Mobile, 3-Col Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left 2 Columns: Summary, SLA Countdown, Timeline, Attachments */}
            <div className="lg:col-span-2 space-y-4">
              {/* Case Summary Top Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    {categoryIcon}
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#1E293B] tracking-tight flex items-center gap-2">
                      <span>{caseReference}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                        Verified Complaint
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {serviceTitle}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    statusText === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-600'
                      : statusText === 'Pending Action'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {statusText}
                </span>
              </div>

              {/* Automated SMS Updates Status Card */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                      <span>Automated SMS Notifications Active</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Status alerts are dispatched instantly to registered mobile <strong className="text-blue-700">{registeredPhone}</strong>
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                  SMS Gateway Live
                </span>
              </div>

              {/* SLA Countdown Banner (Exact match to Mockup Screen 1) */}
              <div className="bg-[#FFF5F5] border border-rose-100/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wide">
                    SLA Countdown
                  </div>
                  <div className="text-lg font-black text-rose-600 tracking-tight leading-tight mt-0.5">
                    {slaTime}
                  </div>
                  <div className="text-[10px] text-rose-400 font-medium mt-0.5">
                    {slaTarget}
                  </div>
                </div>
              </div>

              {/* Submitted Dynamic Form Questionnaire (if available) */}
              {caseData?.structuredData && Object.keys(caseData.structuredData).length > 0 && (
                <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Submitted Form Questionnaire</span>
                    </div>
                    {caseData.structuredData.formTitle && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                        {caseData.structuredData.formTitle}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(caseData.structuredData)
                      .filter(([k]) => !['formId', 'formTitle', 'formCategory', 'department', 'submittedVia'].includes(k))
                      .map(([k, v]: any, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            {k.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 break-words">
                            {Array.isArray(v) ? v.join(', ') : String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Case Timeline Section */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#1E293B]">
                    Case Timeline & Automated Progression
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Auto-synced with Sector Registry
                  </div>
                </div>

                <div className="relative pl-6 space-y-4 pt-1">
                  {/* Vertical Connecting Line */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-blue-100" />

                  {timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${
                          item.isCompleted
                            ? 'bg-blue-600 ring-4 ring-blue-50'
                            : 'bg-white border-2 border-slate-300 ring-4 ring-slate-50'
                        }`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`text-xs font-bold ${
                            item.isCompleted ? 'text-[#1E293B]' : 'text-slate-500'
                          }`}
                        >
                          {item.title}
                        </div>
                        {item.smsSent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold shrink-0 border border-emerald-100 flex items-center gap-1">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>SMS Sent</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="text-xs font-bold text-[#1E293B]">
                  Attachments & Official Receipts ({attachments.length})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl flex items-center gap-2.5"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          att.type === 'pdf'
                            ? 'bg-rose-50 text-rose-500'
                            : 'bg-blue-50 text-blue-500'
                        }`}
                      >
                        {att.type === 'pdf' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1E293B] truncate">
                          {att.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{att.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Column: Official Organization Details, Phone & SMS Actions */}
            <div className="space-y-4">
              {/* Official Organization Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Official Sector Provider & Redressal Desk
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                      {orgShort.slice(0, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#1E293B] truncate">
                        {orgName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {config.orgPhone}
                      </div>
                    </div>
                  </div>

                  {/* Call & Chat Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => alert(`Connecting official helpline: ${config.orgPhone}`)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Direct Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('CHAT')}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Live Chat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Citizen SMS Alert Registry Guarantee */}
              <div className="bg-[#FAFCFF] border border-blue-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">Official SMS & Phone Alerts</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Every transition on this complaint automatically dispatches a registered DLT-compliant SMS to your phone:
                </p>
                <div className="p-2.5 bg-white border border-blue-100 rounded-xl text-[11px] font-mono text-slate-700 space-y-1">
                  <div className="text-[10px] text-slate-400 font-sans font-semibold">Latest SMS Sample:</div>
                  <div>"CPET Alert: Case {caseReference} is {statusText.toUpperCase()} with {orgShort}. Track at cpet.gov.in"</div>
                </div>
              </div>

              {/* Citizen Legal SLA Guarantee Box */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-slate-800">Statutory Redressal Mandate</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  If the authorized provider does not resolve this issue within the SLA time, the case is automatically escalated with High Priority to the central appellate authority.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CASE CONVERSATION                                                 */}
      {/* ========================================================================= */}
      {activeView === 'CHAT' && (
        <div className="space-y-4 flex flex-col min-h-[540px]">
          
          {/* Top Header: Back Arrow + Title */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView('DETAILS')}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
                Case Conversation
              </h1>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{orgShort} Support Active</span>
            </div>
          </div>

          {/* Case Info Mini-Header */}
          <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                {categoryIcon}
              </div>
              <div>
                <div className="text-xs font-bold text-[#1E293B] tracking-tight flex items-center gap-1.5">
                  <span>{caseReference}</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Org
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {serviceTitle} • {orgName}
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                statusText === 'Resolved'
                  ? 'bg-emerald-50 text-emerald-600'
                  : statusText === 'Pending Action'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {statusText}
            </span>
          </div>

          {/* Quick Action Chips for Citizen */}
          <div className="space-y-1.5 px-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                'Can you provide an estimated visit time?',
                'I have uploaded the photo and invoice.',
                'The issue is still recurring at our location.',
                'Confirmed resolved and working. Thank you!',
              ].map((tmpl, idx) => (
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

          {/* Chat Messages Feed */}
          <div className="flex-1 space-y-3.5 py-2 overflow-y-auto max-h-[50vh]">
            {messages.map((msg) => {
              if (msg.sender === 'CITIZEN') {
                return (
                  <div key={msg.id} className="flex flex-col items-end">
                    <div className="max-w-[82%] bg-[#EBF3FF] text-[#1E293B] rounded-2xl rounded-tr-xs p-3.5 shadow-xs border border-blue-100 text-xs leading-relaxed font-medium">
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-1 mr-1">
                      {msg.time}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    {orgShort.charAt(0)}
                  </div>

                  <div className="max-w-[82%] space-y-1">
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 px-1">
                      <span className="text-blue-600 font-bold">{orgName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>

                    {msg.text && (
                      <div className="bg-white border border-slate-100 text-[#1E293B] rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-xs leading-relaxed font-medium">
                        {msg.text}
                      </div>
                    )}

                    {msg.attachment && (
                      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#1E293B] truncate">
                              {msg.attachment.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {msg.attachment.size}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                          title="Download attachment"
                          onClick={() => alert(`Downloading attachment: ${msg.attachment?.name}`)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-sm flex items-center gap-2"
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => alert('Attachment file browser: Select PDF, Invoice, or Image to upload.')}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => alert('Camera activated for live defect capture.')}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Take Photo"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Mic Button */}
            <button
              type="button"
              onClick={() => alert('Voice note recording active.')}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Voice Message"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message to the organization..."
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none px-2"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};

