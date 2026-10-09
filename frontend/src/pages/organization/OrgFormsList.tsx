import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Inbox,
  Clock,
  Edit,
  Trash2,
  Globe,
  Layers,
} from 'lucide-react';
import { DynamicForm } from '../../types/form.js';
import { fetchForms, deleteForm, updateForm } from '../../services/forms.js';
import { cn } from '../../design-system/utils.js';

export const OrgFormsList: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const orgId = user?.organizationId || undefined;
      const data = await fetchForms({
        organizationId: orgId,
        token,
      });
      setForms(data);
    } catch (err) {
      console.error('Failed to load organization forms:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleCopyLink = (form: DynamicForm, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/forms/${form.slug || form._id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(form._id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleStatus = async (form: DynamicForm, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const nextStatus = form.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await updateForm(form._id, { status: nextStatus }, token);
      setForms((prev) =>
        prev.map((f) => (f._id === form._id ? { ...f, status: nextStatus } : f))
      );
    } catch (err) {
      console.error('Failed to update form status:', err);
    }
  };

  const handleDelete = async (formId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!window.confirm('Are you sure you want to archive this form? Submissions will remain safe.')) return;
    try {
      await deleteForm(formId, token);
      setForms((prev) => prev.filter((f) => f._id !== formId));
    } catch (err) {
      console.error('Failed to archive form:', err);
    }
  };

  const filteredForms = forms.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.department && f.department.toLowerCase().includes(q)) ||
        f.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionsCount || 0), 0);
  const publishedCount = forms.filter((f) => f.status === 'PUBLISHED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Layers className="w-4 h-4" />
            <span>Form Studio & Citizen Gateway</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dynamic Forms Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Build and publish custom citizen intake forms, warranty requests, and service applications. Published forms are instantly accessible to citizens in their dashboard and via direct public links.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/organization/forms/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Form</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Forms</p>
            <p className="text-2xl font-black text-slate-900">{forms.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Live / Published</p>
            <p className="text-2xl font-black text-slate-900">{publishedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-black text-slate-900">{totalSubmissions}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average SLA Target</p>
            <p className="text-2xl font-black text-slate-900">24h</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms by title, category, department..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer',
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            All Forms ({forms.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PUBLISHED')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer',
              statusFilter === 'PUBLISHED'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            Published ({publishedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DRAFT')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer',
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            Drafts ({forms.length - publishedCount})
          </button>
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500 mt-3">Loading forms catalog...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Forms Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            {searchQuery
              ? 'No forms match your search filter. Try clearing the search query.'
              : 'Create your first custom dynamic form to publish it for citizen submissions.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/organization/forms/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Form</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => {
            const isPublished = form.status === 'PUBLISHED';

            return (
              <div
                key={form._id}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                          isPublished
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border-amber-200/80'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          )}
                        />
                        {form.status}
                      </span>

                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {form.category}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {form.slaHours}h SLA
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {form.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {form.description || 'No description provided for this form.'}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">
                      {form.fields?.length || 0} Dynamic Fields
                    </span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {form.submissionsCount || 0} Submissions
                    </span>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Copy Link Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(form, e)}
                      title="Copy Public Link"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    >
                      {copiedId === form._id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Direct Preview Link */}
                    <a
                      href={`/forms/${form.slug || form._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Public Form View"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {/* Toggle Status */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(form, e)}
                      title={isPublished ? 'Unpublish Form' : 'Publish Form'}
                      className={cn(
                        'text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer',
                        isPublished
                          ? 'text-slate-600 hover:text-amber-700 bg-white border-slate-200'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      )}
                    >
                      {isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Submissions */}
                    <button
                      type="button"
                      onClick={() => navigate(`/organization/forms/${form._id}/submissions`)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
                    >
                      Submissions ({form.submissionsCount || 0})
                    </button>

                    {/* Edit Form */}
                    <button
                      type="button"
                      onClick={() => navigate(`/organization/forms/${form._id}/edit`)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Edit Form Schema"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete / Archive */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(form._id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      title="Archive Form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
