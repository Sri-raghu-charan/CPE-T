import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Tag,
  MapPin,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Droplet,
  CreditCard,
  AlertTriangle,
  FileText,
  Search,
  Check,
  X,
} from 'lucide-react';
import { ADMIN_ORGANIZATIONS_DATA, OrgListItem } from './AdminOrganizations.js';

export const AdminOrgDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrgListItem>(() => {
    const found = ADMIN_ORGANIZATIONS_DATA.find((o) => o.id === id);
    return (
      found || {
        id: 'org-water',
        name: 'Water Supply Department',
        category: 'Water Supply',
        serviceCount: 12,
        status: 'Active',
        icon: Droplet,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        location: 'Rajahmundry, East Godavari',
        email: 'support@wsd.gov.in',
        phone: '+91 88972 44567',
        slaDeadline: '4 hours',
      }
    );
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: org.name,
    category: org.category,
    location: org.location || 'Rajahmundry, East Godavari',
    email: org.email || 'support@wsd.gov.in',
    phone: org.phone || '+91 88972 44567',
    slaDeadline: org.slaDeadline || '4 hours',
    status: org.status,
  });

  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    const found = ADMIN_ORGANIZATIONS_DATA.find((o) => o.id === id);
    if (found) {
      setOrg(found);
      setFormData({
        name: found.name,
        category: found.category,
        location: found.location || 'Rajahmundry, East Godavari',
        email: found.email || 'support@wsd.gov.in',
        phone: found.phone || '+91 88972 44567',
        slaDeadline: found.slaDeadline || '4 hours',
        status: found.status,
      });
    }
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setOrg((prev) => ({
      ...prev,
      name: formData.name,
      category: formData.category,
      location: formData.location,
      email: formData.email,
      phone: formData.phone,
      slaDeadline: formData.slaDeadline,
      status: formData.status as 'Active' | 'Pending' | 'Suspended',
    }));
    setShowEditModal(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const servicesList = [
    { title: 'New Connection', icon: CheckCircle2 },
    { title: 'Bill Payment', icon: CreditCard },
    { title: 'Leakage Complaint', icon: AlertTriangle },
    { title: 'Water Quality', icon: Droplet },
    { title: 'Meter Service', icon: Search },
    { title: 'Other Services', icon: FileText },
  ];

  const OrgIcon = org.icon || Droplet;

  return (
    <div className="w-full max-w-md md:max-w-4xl mx-auto space-y-4 pb-12 select-none font-sans text-slate-800">
      
      {/* 1. Top Header: Back Arrow + Title (Matching Screen 2) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/admin/organizations')}
          aria-label="Back to organizations"
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          Organization Details
        </h1>
      </div>

      {/* Save Success Banner */}
      {saveToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Organization details updated successfully!</span>
          </div>
          <button onClick={() => setSaveToast(false)} aria-label="Dismiss toast" className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Hero & Organization Metadata Card (Screen 2 Top Card) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-5">
        
        {/* Top Org Header: Big Icon + Name + Category + Active Pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A56DB] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <OrgIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1E293B] leading-snug">
                {org.name}
              </h2>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                {org.category}
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 shrink-0">
            <span>↑</span>
            <span>{org.status}</span>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Category</span>
            </div>
            <span className="font-bold text-[#1E293B]">{org.category}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Location</span>
            </div>
            <span className="font-bold text-[#1E293B]">{org.location}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact Email</span>
            </div>
            <span className="font-bold text-blue-600">{org.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact Phone</span>
            </div>
            <span className="font-bold text-[#1E293B]">{org.phone}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>SLA Deadline</span>
            </div>
            <span className="font-bold text-[#1E293B]">{org.slaDeadline}</span>
          </div>

        </div>

      </div>

      {/* 3. Services (12) 2-Column Grid Card (Screen 2 Middle Card) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#1E293B]">
            Services ({org.serviceCount})
          </h3>
          <button
            type="button"
            onClick={() => navigate('/admin/services')}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        {/* 2-Column Services Pill Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {servicesList.map((svc) => {
            const SvcIcon = svc.icon;
            return (
              <div
                key={svc.title}
                onClick={() => alert(`Service: ${svc.title} configuration & workflow active.`)}
                className="p-3 bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-[#1E293B] transition-all cursor-pointer shadow-2xs"
              >
                <SvcIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{svc.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Performance Card (Screen 2 Bottom Metric Card) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3.5">
        <h3 className="text-sm font-extrabold text-[#1E293B]">
          Recent Performance
        </h3>

        <div className="grid grid-cols-2 gap-3">
          
          {/* Gauge 1: SLA Compliance Circular Ring */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center space-y-2 text-center">
            <span className="text-[11px] font-semibold text-slate-500">
              SLA Compliance
            </span>

            {/* Circular SVG Ring Progress Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray="92, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-[#1E293B]">
                92%
              </span>
            </div>
          </div>

          {/* Metric 2: Resolved Cases */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              Resolved Cases
            </span>
            <div className="text-2xl font-black text-[#1E293B] tracking-tight my-1">
              1,248
            </div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span>↑ 12%</span>
            </div>
          </div>

        </div>
      </div>

      {/* 5. Solid Blue Button: Edit Organization (Screen 2 Bottom Button) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="w-full py-4 px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer"
        >
          Edit Organization
        </button>
      </div>

      {/* 6. Edit Organization Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-[#1E293B]">
                Edit Organization
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label="Close edit modal"
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SLA Deadline</label>
                  <input
                    type="text"
                    required
                    value={formData.slaDeadline}
                    onChange={(e) => setFormData({ ...formData, slaDeadline: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
