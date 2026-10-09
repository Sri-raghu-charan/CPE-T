import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  FileText,
  Search,
  ExternalLink,
  MessageSquare,
  User,
  Phone,
  Copy,
  Check,
} from 'lucide-react';
import { DynamicForm } from '../../types/form.js';
import { fetchFormByIdOrSlug, fetchFormSubmissions } from '../../services/forms.js';
import { cn } from '../../design-system/utils.js';

export const OrgFormSubmissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const [formData, subsData] = await Promise.all([
        fetchFormByIdOrSlug(id, token),
        fetchFormSubmissions(id, token).catch(() => []),
      ]);
      setForm(formData);
      setSubmissions(subsData);
    } catch (err) {
      console.error('Failed to load form submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyLink = () => {
    if (!form) return;
    const url = `${window.location.origin}/forms/${form.slug || form._id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = (sub.referenceNumber || '').toLowerCase();
      const citizen = (sub.requesterName || sub.requesterId?.name || '').toLowerCase();
      const title = (sub.title || '').toLowerCase();
      return ref.includes(q) || citizen.includes(q) || title.includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500 mt-3">Loading submissions queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/organization/forms')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 mt-0.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Form Submissions Queue
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {form?.category}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ⏱ {form?.slaHours || 24}h SLA
                </span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                {form?.title || 'Form Submissions'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {form?.description || 'Review responses submitted by citizens for this dynamic form.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Form Link'}</span>
            </button>

            <a
              href={`/forms/${form?.slug || form?._id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Public View</span>
            </a>
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
            placeholder="Search by citizen name, reference number..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'SUBMITTED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer',
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table / Cards */}
      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Submissions Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Citizens have not submitted this form yet. Share the public link or feature it on the citizen portal to start receiving responses.
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Copy Form URL to Share
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Reference & Time</th>
                  <th className="px-5 py-3.5">Citizen Submitter</th>
                  <th className="px-5 py-3.5">Structured Answers Summary</th>
                  <th className="px-5 py-3.5">Priority & Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const citizenName = sub.requesterName || sub.requesterId?.name || 'Citizen';
                  const citizenPhone = sub.requesterPhone || sub.requesterId?.phone || '+91 94940 12345';
                  const answers = sub.structuredData || {};

                  return (
                    <tr
                      key={sub._id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/organization/requests/${sub._id}`)}
                    >
                      {/* Reference & Time */}
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-blue-700 text-xs group-hover:underline">
                          {sub.referenceNumber || sub._id}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(sub.submittedAt || sub.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Citizen Submitter */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{citizenName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{citizenPhone}</span>
                        </div>
                      </td>

                      {/* Structured Answers Summary */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="space-y-1">
                          {Object.entries(answers)
                            .filter(([k]) => !['formId', 'formTitle', 'formCategory', 'department', 'submittedVia'].includes(k))
                            .slice(0, 2)
                            .map(([key, val]: any, i) => (
                              <div key={i} className="text-[11px] truncate">
                                <span className="font-semibold text-slate-600 capitalize">{key}: </span>
                                <span className="text-slate-800 font-medium">{String(val)}</span>
                              </div>
                            ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                            sub.status === 'SUBMITTED' && 'bg-purple-50 text-purple-700 border-purple-200',
                            sub.status === 'IN_PROGRESS' && 'bg-amber-50 text-amber-700 border-amber-200',
                            sub.status === 'WAITING_FOR_USER' && 'bg-blue-50 text-blue-700 border-blue-200',
                            sub.status === 'RESOLVED' && 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}
                        >
                          {sub.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/organization/requests/${sub._id}`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Two-Way Chat & Triage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
