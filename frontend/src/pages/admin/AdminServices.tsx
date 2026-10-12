import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Sliders,
  Clock,
  CheckCircle2,
  Building2,
  LayoutDashboard,
  Settings,
  Plus,
  Edit2,
  X,
  Check,
  ShieldAlert,
  Droplet,
  Zap,
  Heart,
  Bus,
  Flame,
  GraduationCap,
} from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  department: string;
  category: string;
  slaHours: number;
  priority: 'High' | 'Medium' | 'Critical' | 'Low';
  enabled: boolean;
  icon: React.ElementType;
}

const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'svc-1',
    name: 'New Water Connection Request',
    department: 'Water Supply Department',
    category: 'Water Supply',
    slaHours: 24,
    priority: 'Medium',
    enabled: true,
    icon: Droplet,
  },
  {
    id: 'svc-2',
    name: 'Main Pipeline Leakage Repair',
    department: 'Water Supply Department',
    category: 'Water Supply',
    slaHours: 4,
    priority: 'Critical',
    enabled: true,
    icon: Droplet,
  },
  {
    id: 'svc-3',
    name: 'Power Outage & Transformer Fault',
    department: 'Electricity Board',
    category: 'Electricity',
    slaHours: 2,
    priority: 'Critical',
    enabled: true,
    icon: Zap,
  },
  {
    id: 'svc-4',
    name: 'New Meter Installation',
    department: 'Electricity Board',
    category: 'Electricity',
    slaHours: 48,
    priority: 'Low',
    enabled: true,
    icon: Zap,
  },
  {
    id: 'svc-5',
    name: 'Emergency Ambulance & Blood Dispatch',
    department: 'Health Department',
    category: 'Healthcare',
    slaHours: 1,
    priority: 'Critical',
    enabled: true,
    icon: Heart,
  },
  {
    id: 'svc-6',
    name: 'Anti-Ragging Incident Escalation',
    department: 'Anti-Ragging & Higher Education',
    category: 'Education',
    slaHours: 6,
    priority: 'High',
    enabled: true,
    icon: GraduationCap,
  },
  {
    id: 'svc-7',
    name: 'Cyber Financial Fraud Reporting',
    department: 'Cyber Crime Reporting Desk',
    category: 'Cyber & Police',
    slaHours: 2,
    priority: 'Critical',
    enabled: true,
    icon: ShieldAlert,
  },
  {
    id: 'svc-8',
    name: 'Bus Route & Transit Grievance',
    department: 'Transport Department',
    category: 'Transport',
    slaHours: 24,
    priority: 'Medium',
    enabled: true,
    icon: Bus,
  },
  {
    id: 'svc-9',
    name: 'Fire Hazard & Safety Clearance',
    department: 'Fire Services',
    category: 'Emergency',
    slaHours: 12,
    priority: 'High',
    enabled: true,
    icon: Flame,
  },
];

export const AdminServices: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  const departments = ['All', 'Water Supply', 'Electricity', 'Healthcare', 'Education', 'Cyber & Police', 'Transport', 'Emergency'];

  const filteredServices = services.filter((svc) => {
    if (selectedDept !== 'All' && svc.category !== selectedDept) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return svc.name.toLowerCase().includes(q) || svc.department.toLowerCase().includes(q);
    }
    return true;
  });

  const handleToggle = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setServices((prev) =>
      prev.map((s) => (s.id === editingService.id ? editingService : s))
    );
    setEditingService(null);
    setShowToast('Service SLA updated successfully!');
    setTimeout(() => setShowToast(null), 3000);
  };

  return (
    <div className="w-full max-w-md md:max-w-4xl mx-auto space-y-4 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            aria-label="Back to dashboard"
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
              Service Catalog & SLA
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const newSvc: ServiceItem = {
              id: `svc-${Date.now()}`,
              name: 'New Custom Public Service',
              department: 'Municipal Corporation',
              category: 'Municipal Services',
              slaHours: 24,
              priority: 'Medium',
              enabled: true,
              icon: CheckCircle2,
            };
            setServices([newSvc, ...services]);
            setShowToast('New service added to catalog!');
            setTimeout(() => setShowToast(null), 3000);
          }}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Service</span>
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{showToast}</span>
          </div>
          <button onClick={() => setShowToast(null)} aria-label="Dismiss toast" className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Search Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services or departments..."
          aria-label="Search services or departments"
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {departments.map((dept) => (
          <button
            key={dept}
            type="button"
            onClick={() => setSelectedDept(dept)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedDept === dept
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* 4. Services List */}
      <div className="space-y-2.5">
        {filteredServices.map((svc) => {
          const Icon = svc.icon;
          return (
            <div
              key={svc.id}
              className={`bg-white border rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between gap-3 ${
                svc.enabled ? 'border-slate-100 hover:border-blue-200' : 'border-slate-100 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-[#1E293B] truncate">
                    {svc.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5 flex items-center gap-2">
                    <span>{svc.department}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" /> SLA: {svc.slaHours}h
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    svc.priority === 'Critical'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : svc.priority === 'High'
                      ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {svc.priority}
                </span>

                <button
                  type="button"
                  onClick={() => setEditingService(svc)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Edit SLA"
                  aria-label={`Edit ${svc.name} SLA`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Enable/Disable Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(svc.id)}
                  role="switch"
                  aria-checked={svc.enabled}
                  aria-label={`Toggle ${svc.name} active status`}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    svc.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      svc.enabled ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-2">
            <div className="text-xs font-bold text-slate-500">No services found</div>
            <p className="text-[11px] text-slate-400">Try choosing a different department or clear your search.</p>
          </div>
        )}
      </div>

      {/* Edit Service SLA Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-[#1E293B]">
                Configure Service SLA
              </h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                aria-label="Close edit SLA modal"
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={editingService.department}
                  onChange={(e) => setEditingService({ ...editingService, department: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SLA Resolution (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    required
                    value={editingService.slaHours}
                    onChange={(e) => setEditingService({ ...editingService, slaHours: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Escalation Priority</label>
                  <select
                    value={editingService.priority}
                    onChange={(e) => setEditingService({ ...editingService, priority: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-sm"
                >
                  Save SLA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[#2563EB] font-bold cursor-pointer relative scale-105"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Services</span>
          <span className="absolute -bottom-1 w-3 h-0.5 bg-[#2563EB] rounded-full" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Settings</span>
        </button>
      </nav>

    </div>
  );
};
