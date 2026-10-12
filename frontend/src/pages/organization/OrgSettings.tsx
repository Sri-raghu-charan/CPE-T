import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  MessageSquare,
  Bell,
  Check,
  X,
} from 'lucide-react';

export const OrgSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [slaHours, setSlaHours] = useState('48');
  const [autoAssign, setAutoAssign] = useState(true);
  const [channels, setChannels] = useState({
    email: true,
    phone: true,
    sms: true,
    inApp: true,
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!user?.organizationId) return;
      try {
        const res = await fetch(`/api/v1/organizations/${user.organizationId}/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.settings) {
            if (json.data.settings.defaultSlaHours) {
              setSlaHours(String(json.data.settings.defaultSlaHours));
            }
            if (json.data.settings.autoAssign !== undefined) {
              setAutoAssign(Boolean(json.data.settings.autoAssign));
            }
          }
        }
      } catch (err) {
        console.warn('Could not load org settings from backend', err);
      }
    }
    loadSettings();
  }, [user?.organizationId, token]);

  const updateBackendSettings = async (updates: { autoAssign?: boolean; defaultSlaHours?: number }) => {
    if (!user?.organizationId) return;
    try {
      await fetch(`/api/v1/organizations/${user.organizationId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Could not persist org settings', err);
    }
  };

  const categories = [
    { name: 'Water Supply', desc: 'Pipelines, pressure, leakage, quality' },
    { name: 'Electricity', desc: 'Power cuts, meters, transformer issues' },
    { name: 'Mobile Network', desc: 'Connectivity, signal, tower faults' },
    { name: 'Consumer Goods', desc: 'Appliance servicing, billing, warranty' },
  ];

  const handleChannelToggle = (channel: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
    setToast('Notification channel preference updated!');
    setTimeout(() => setToast(null), 2500);
  };

  const handleCategoryClick = (categoryName: string) => {
    setToast(`Category routing rules for ${categoryName} opened.`);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header: Back Arrow + Title (Screen 1 Exact) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/organization/dashboard')}
            aria-label="Back to dashboard"
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
            Organization Settings
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('/organization/profile')}
          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
        >
          View Profile
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} aria-label="Dismiss toast" className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. SLA Configuration Card (Screen 1 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-extrabold text-[#1E293B]">
          SLA Configuration
        </h2>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Standard SLA (Hours)
          </label>
          <div className="relative">
            <select
              value={slaHours}
              onChange={(e) => {
                const val = e.target.value;
                setSlaHours(val);
                updateBackendSettings({ defaultSlaHours: Number(val) });
                setToast(`Standard SLA updated to ${val} hours`);
                setTimeout(() => setToast(null), 2500);
              }}
              className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
            >
              <option value="4">4 hours (Urgent / Critical)</option>
              <option value="12">12 hours (High Priority)</option>
              <option value="24">24 hours (Standard)</option>
              <option value="48">48 hours (Default)</option>
              <option value="72">72 hours (Extended)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Auto Assignment Rules Card (Screen 1 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-2">
        <h2 className="text-sm font-extrabold text-[#1E293B]">
          Auto Assignment Rules
        </h2>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-600 font-medium">
            Enable auto assignment
          </span>

          <button
            type="button"
            onClick={() => {
              const nextVal = !autoAssign;
              setAutoAssign(nextVal);
              updateBackendSettings({ autoAssign: nextVal });
              setToast(nextVal ? 'Auto assignment enabled' : 'Auto assignment disabled');
              setTimeout(() => setToast(null), 2500);
            }}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              autoAssign ? 'bg-[#2563EB]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                autoAssign ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Category Mappings Card (Screen 1 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-extrabold text-[#1E293B]">
          Category Mappings
        </h2>

        <div className="divide-y divide-slate-100">
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className="py-3 flex items-center justify-between hover:bg-slate-50/70 -mx-2 px-2 rounded-xl transition-colors cursor-pointer group"
            >
              <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Contact Channels Card (Screen 1 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3.5">
        <h2 className="text-sm font-extrabold text-[#1E293B]">
          Contact Channels
        </h2>

        <div className="space-y-3 pt-1">
          
          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Email</span>
            </div>
            <button
              type="button"
              onClick={() => handleChannelToggle('email')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                channels.email ? 'bg-[#2563EB]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  channels.email ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Phone</span>
            </div>
            <button
              type="button"
              onClick={() => handleChannelToggle('phone')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                channels.phone ? 'bg-[#2563EB]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  channels.phone ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>SMS</span>
            </div>
            <button
              type="button"
              onClick={() => handleChannelToggle('sms')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                channels.sms ? 'bg-[#2563EB]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  channels.sms ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold">
              <Bell className="w-4 h-4 text-purple-600" />
              <span>In-App Notifications</span>
            </div>
            <button
              type="button"
              onClick={() => handleChannelToggle('inApp')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                channels.inApp ? 'bg-[#2563EB]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  channels.inApp ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
