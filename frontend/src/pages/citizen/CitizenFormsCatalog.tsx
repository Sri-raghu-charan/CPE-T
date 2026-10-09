import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  FileText,
  Search,
  Building2,
  Globe,
  Clock,
  ArrowRight,
  Zap,
  Droplet,
  Tv,
  Heart,
  Landmark,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DynamicForm } from '../../types/form.js';
import { fetchForms } from '../../services/forms.js';
import { cn } from '../../design-system/utils.js';

export const CitizenFormsCatalog: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLIC' | 'ORGANIZATION'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchForms({
        isPublic: true,
        status: 'PUBLISHED',
        token,
      });
      setForms(data);
    } catch (err) {
      console.error('Failed to load forms catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const categories = Array.from(new Set(forms.map((f) => f.category).filter(Boolean)));

  const filteredForms = forms.filter((f) => {
    if (activeTab === 'PUBLIC' && f.organizationId) return false;
    if (activeTab === 'ORGANIZATION' && !f.organizationId) return false;
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.organizationName.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('water')) return <Droplet className="w-5 h-5 text-sky-600" />;
    if (c.includes('power') || c.includes('electric') || c.includes('utilit')) return <Zap className="w-5 h-5 text-amber-500" />;
    if (c.includes('health') || c.includes('blood')) return <Heart className="w-5 h-5 text-rose-600" />;
    if (c.includes('bank') || c.includes('financ')) return <Landmark className="w-5 h-5 text-emerald-600" />;
    if (c.includes('consumer') || c.includes('good') || c.includes('applian')) return <Tv className="w-5 h-5 text-indigo-600" />;
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-blue-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Centralized Citizen Forms Directory</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Discover & Submit Official Forms
          </h1>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Submit public civic grievances, municipal service applications, and verified organization forms. Track submissions with real-time status updates, SLA guarantees, and two-way official communication.
          </p>
        </div>

        {/* Quick Search in Hero */}
        <div className="relative z-10 mt-6 max-w-xl">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forms by service, authority, or problem (e.g., Water, AC warranty, Pothole, ATM dispute)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 rounded-2xl shadow-lg text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-400/30 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Background Ambient Circles */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-24 -bottom-16 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Tabs & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Source Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Forms ({forms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PUBLIC')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'PUBLIC'
                ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public & Civic Forms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ORGANIZATION')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'ORGANIZATION'
                ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Organization-Published Forms</span>
          </button>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500 mt-3">Loading available forms...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-dashed border-slate-300 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Forms Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            No active forms found matching your criteria. Try resetting the category filter or search query.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setActiveTab('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => {
            const isOrgForm = Boolean(form.organizationId);

            return (
              <div
                key={form._id}
                onClick={() => navigate(`/citizen/forms/${form.slug || form._id}`)}
                className="group bg-white rounded-3xl border border-slate-200/90 hover:border-blue-400 p-6 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 group-hover:bg-blue-50 group-hover:border-blue-200 flex items-center justify-center shrink-0 transition-colors">
                      {getCategoryIcon(form.category)}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                          isOrgForm
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {isOrgForm ? 'Verified Organization' : 'Public Civic Service'}
                      </span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {form.slaHours}h SLA
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 block mb-0.5">
                      {form.organizationName}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {form.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {form.description || 'Fill and submit this official form to register your case.'}
                    </p>
                  </div>
                </div>

                {/* Bottom CTA & Metadata */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 font-medium">
                    <span>{form.fields?.length || 0} Required Fields</span>
                  </div>

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                    <span>Fill Form</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
