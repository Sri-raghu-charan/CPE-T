import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  Bell,
  CheckCircle2,
  MessageSquare,
  Settings,
  CheckCheck,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  read: boolean;
  type: 'assigned' | 'sla' | 'resolved' | 'message' | 'system';
  caseId?: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New request assigned',
    detail: 'CPET-2025-1043',
    timeAgo: '2h ago',
    read: false,
    type: 'assigned',
    caseId: 'CPET-2025-1043',
  },
  {
    id: 'notif-2',
    title: 'SLA reminder',
    detail: 'CPET-2025-1040 is nearing deadline',
    timeAgo: '3h ago',
    read: false,
    type: 'sla',
    caseId: 'CPET-2025-1040',
  },
  {
    id: 'notif-3',
    title: 'Case resolved',
    detail: 'CPET-2025-1038',
    timeAgo: '6h ago',
    read: true,
    type: 'resolved',
    caseId: 'CPET-2025-1038',
  },
  {
    id: 'notif-4',
    title: 'New message',
    detail: 'From citizen in CPET-2025-1041',
    timeAgo: '8h ago',
    read: false,
    type: 'message',
    caseId: 'CPET-2025-1041',
  },
  {
    id: 'notif-5',
    title: 'System update',
    detail: 'Maintenance scheduled tonight',
    timeAgo: '12h ago',
    read: true,
    type: 'system',
  },
];

export const OrgNotifications: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'read') return n.read;
    return true;
  });

  const handleNotificationClick = (n: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    );
    if (n.caseId) {
      navigate(`/organization/requests/${n.caseId}`);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'assigned':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
        );
      case 'sla':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
      case 'resolved':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'message':
        return (
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'system':
        return (
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header: Back Arrow + Title (Screen 3 Exact) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/organization/dashboard')}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
            Notifications
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* 2. Filter Pills Row: [ All ] | [ Unread (3) ] | [ Read ] (Screen 3 Exact) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'unread'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                activeTab === 'unread'
                  ? 'bg-white text-[#2563EB]'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('read')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'read'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          Read
        </button>
      </div>

      {/* 3. Notifications List Items (Screen 3 Exact) */}
      <div className="space-y-2.5">
        {filteredNotifications.map((n) => (
          <div
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
              n.read
                ? 'bg-white/70 border-slate-100 hover:border-slate-200'
                : 'bg-white border-blue-100/80 shadow-xs hover:border-blue-300 ring-1 ring-blue-50'
            }`}
          >
            {/* Left: Icon + Content */}
            <div className="flex items-center gap-3.5 min-w-0">
              {renderIcon(n.type)}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-[#1E293B] group-hover:text-blue-600 transition-colors truncate">
                    {n.title}
                  </span>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                  {n.detail}
                </div>
              </div>
            </div>

            {/* Right: Time Ago */}
            <div className="text-[11px] text-slate-400 font-medium shrink-0">
              {n.timeAgo}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="p-8 bg-white border border-slate-100 rounded-3xl text-center space-y-2">
            <div className="text-xs font-bold text-slate-500">No notifications found</div>
            <p className="text-[11px] text-slate-400">All caught up! Real-time alerts will appear here.</p>
          </div>
        )}
      </div>

    </div>
  );
};
