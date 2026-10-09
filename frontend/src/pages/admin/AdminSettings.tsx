import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Bell,
  MessageSquare,
  Shield,
  Smartphone,
  Save,
  Check,
  Send,
  Building2,
  Sliders,
  LayoutDashboard,
  Clock,
  Key,
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();

  const [smsGateway, setSmsGateway] = useState<'fast2sms' | 'twilio' | 'textlocal'>('fast2sms');
  const [apiKey, setApiKey] = useState('cpet_live_fast2sms_9984210a74b');
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [autoEscalateSla, setAutoEscalateSla] = useState(true);
  const [slaEscalationThreshold, setSlaEscalationThreshold] = useState('75');
  const [testPhoneNumber, setTestPhoneNumber] = useState('+91 98765 43210');
  
  const [banner, setBanner] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const showBannerMessage = (msg: string, type: 'success' | 'info' = 'success') => {
    setBanner({ type, message: msg });
    setTimeout(() => setBanner(null), 3500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showBannerMessage('System & SMS gateway settings saved successfully!');
  };

  const handleTestSms = () => {
    if (!testPhoneNumber.trim()) return;
    showBannerMessage(`Test SMS dispatched to ${testPhoneNumber}: "[CPET Alert] Status changed to IN_PROGRESS. SLA timer active."`);
  };

  const auditLogs = [
    { id: '1', action: 'Water Supply Department SLA updated to 4 hours', actor: 'Administrator (AD)', time: '10 mins ago' },
    { id: '2', action: 'SMS Gateway Fast2SMS ping verified successfully', actor: 'System Daemon', time: '1 hour ago' },
    { id: '3', action: 'Anti-Ragging nodal officer account provisioned', actor: 'Administrator (AD)', time: '3 hours ago' },
    { id: '4', action: 'Electricity Board 14 cases resolved automatically', actor: 'Automation Engine', time: '5 hours ago' },
  ];

  return (
    <div className="w-full max-w-md md:max-w-4xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          Admin System Settings
        </h1>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
          banner.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{banner.message}</span>
        </div>
      )}

      {/* 2. SMS & Citizen Notification Dispatcher */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#1E293B]">
              SMS & Phone Notification Gateway
            </h2>
            <p className="text-[11px] text-slate-400">
              Sends instant SMS updates to citizen phone numbers when ticket status changes
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary SMS Provider</label>
              <select
                value={smsGateway}
                onChange={(e) => setSmsGateway(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="fast2sms">Fast2SMS (Govt DLT Approved)</option>
                <option value="twilio">Twilio Programmable SMS</option>
                <option value="textlocal">Textlocal India Nodal Gateway</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">API Key / Auth Token</label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="font-bold text-slate-800">SMS on Complaint Status Change</span>
                  <p className="text-[10px] text-slate-400">Notifies citizen whenever an officer marks status as Pending, In-Progress, or Resolved</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOnStatusChange}
                onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-600" />
                <div>
                  <span className="font-bold text-slate-800">SMS on Ticket Intake & Tracking ID</span>
                  <p className="text-[10px] text-slate-400">Sends instant CPET grievance tracking number to user phone upon form submission</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOnCreate}
                onChange={(e) => setNotifyOnCreate(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Test SMS Dispatcher */}
          <div className="pt-2 p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-2.5">
            <div className="w-full sm:flex-1">
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Test Citizen Phone Number</label>
              <input
                type="text"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={handleTestSms}
              className="w-full sm:w-auto mt-2 sm:mt-4 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Test SMS</span>
            </button>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save SMS Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. SLA Escalation Engine */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#1E293B]">
              Automated SLA Escalation Rules
            </h2>
            <p className="text-[11px] text-slate-400">
              Escalates delayed public grievances to higher authority if SLA threshold is breached
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800">Auto-Escalation Enabled</span>
              <p className="text-[10px] text-slate-400">Flag cases in red when nearing resolution deadline</p>
            </div>
            <input
              type="checkbox"
              checked={autoEscalateSla}
              onChange={(e) => setAutoEscalateSla(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
            />
          </label>

          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-600">Escalation Trigger Threshold</span>
            <select
              value={slaEscalationThreshold}
              onChange={(e) => setSlaEscalationThreshold(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
            >
              <option value="50">At 50% SLA Elapse</option>
              <option value="75">At 75% SLA Elapse (Default)</option>
              <option value="90">At 90% SLA Elapse</option>
              <option value="100">Immediately upon Breach</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Audit Logs */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-extrabold text-[#1E293B]">
            System Audit Trail
          </h2>
        </div>

        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">{log.action}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">By {log.actor}</p>
              </div>
              <span className="text-[10px] font-medium text-slate-400 shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around z-30 shadow-lg md:hidden">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/organizations')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Organizations</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/services')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Services</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[#2563EB] font-bold cursor-pointer relative scale-105"
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Settings</span>
          <span className="absolute -bottom-1 w-3 h-0.5 bg-[#2563EB] rounded-full" />
        </button>
      </nav>

    </div>
  );
};
