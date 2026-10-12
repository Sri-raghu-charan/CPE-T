import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Droplet,
  Edit3,
  Check,
  X,
} from 'lucide-react';

export const OrgProfile: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: 'Water Supply Department',
    type: 'Government',
    email: 'support@wsd.gov.in',
    phone: '+91 88972 44567',
    addressLine1: 'Rajahmundry, East Godavari',
    addressLine2: 'Andhra Pradesh - 533101',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ ...profile });
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({ ...formData });
    setShowEditModal(false);
    setToast('Profile updated successfully!');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto space-y-5 pb-20 select-none font-sans text-slate-800">
      
      {/* 1. Header: Back Arrow + Title (Screen 2 Exact) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/organization/dashboard')}
          aria-label="Back to dashboard"
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
          Profile & Organization Info
        </h1>
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

      {/* 2. Main Profile Card (Screen 2 Exact) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* Top Hero Icon + Department Title */}
        <div className="flex items-center gap-4 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1A56DB] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Droplet className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-[#1E293B] leading-snug">
              {profile.name}
            </h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {profile.type} Organization
            </p>
          </div>
        </div>

        {/* 2-Column Info Metadata Table */}
        <div className="space-y-4 pt-4 border-t border-slate-100 text-xs sm:text-sm">
          
          <div className="grid grid-cols-3 gap-2 items-start">
            <span className="text-slate-400 font-medium col-span-1">
              Organization Name
            </span>
            <span className="font-bold text-[#1E293B] col-span-2">
              {profile.name}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-start">
            <span className="text-slate-400 font-medium col-span-1">
              Type
            </span>
            <span className="font-bold text-[#1E293B] col-span-2">
              {profile.type}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-start">
            <span className="text-slate-400 font-medium col-span-1">
              Email
            </span>
            <span className="font-bold text-blue-600 col-span-2">
              {profile.email}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-start">
            <span className="text-slate-400 font-medium col-span-1">
              Phone
            </span>
            <span className="font-bold text-[#1E293B] col-span-2">
              {profile.phone}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-start">
            <span className="text-slate-400 font-medium col-span-1">
              Address
            </span>
            <div className="font-bold text-[#1E293B] col-span-2 space-y-0.5">
              <div>{profile.addressLine1}</div>
              <div>{profile.addressLine2}</div>
            </div>
          </div>

        </div>

        {/* Edit Profile Button (Screen 2 Bottom Button) */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setFormData({ ...profile });
              setShowEditModal(true);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-blue-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-[#1E293B]">
                Edit Organization Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label="Close edit profile modal"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Organization Type</label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-sm"
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
