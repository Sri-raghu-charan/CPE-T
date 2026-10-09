import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  MapPin,
  Star,
  Send,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { DynamicForm } from '../../types/form.js';
import { fetchFormByIdOrSlug, submitDynamicForm } from '../../services/forms.js';
import { cn } from '../../design-system/utils.js';

export const CitizenDynamicFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Field Values
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; type: string; size: number }>>([]);
  const [locationValue, setLocationValue] = useState('');

  // Citizen Contact Details (Pre-filled if logged in)
  const [citizenName, setCitizenName] = useState(user?.name || '');
  const [citizenEmail, setCitizenEmail] = useState(user?.email || '');
  const [citizenPhone, setCitizenPhone] = useState(user?.phoneNumber || user?.phone || '+91 94940 12345');

  // Submission Result
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const loadForm = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchFormByIdOrSlug(id, token);
      setForm(data);

      // Initialize default values for answers
      const defaults: Record<string, any> = {};
      data.fields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          defaults[f.name] = f.defaultValue;
        } else if (f.type === 'checkbox') {
          defaults[f.name] = [];
        } else if (f.type === 'rating') {
          defaults[f.name] = 5;
        } else {
          defaults[f.name] = '';
        }
      });
      setAnswers(defaults);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load form');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const handleInputChange = (name: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxToggle = (fieldName: string, optionValue: string) => {
    const current = (answers[fieldName] as string[]) || [];
    const exists = current.includes(optionValue);
    const updated = exists
      ? current.filter((x) => x !== optionValue)
      : [...current, optionValue];
    handleInputChange(fieldName, updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mockUploaded = {
      name: file.name,
      url: `https://storage.cpet.gov.in/docs/${encodeURIComponent(file.name)}`,
      type: file.type || 'application/pdf',
      size: file.size,
    };
    setUploadedFiles((prev) => [...prev, mockUploaded]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.required) {
        const val = answers[field.name];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          setErrorMsg(`Please fill in required field: "${field.label}"`);
          return;
        }
      }
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        formId: form._id,
        answers: {
          ...answers,
          locationAddress: locationValue || answers.locationAddress,
        },
        citizenInfo: {
          name: citizenName,
          email: citizenEmail,
          phone: citizenPhone,
        },
        attachments: uploadedFiles,
        location: locationValue ? { address: locationValue } : undefined,
      };

      const res = await submitDynamicForm(form._id, payload, token);
      setSubmissionResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500 mt-3">Loading dynamic form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Form Not Available</h2>
        <p className="text-xs text-slate-500">The requested form does not exist or has been archived.</p>
        <button
          type="button"
          onClick={() => navigate('/citizen/forms')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
        >
          Return to Forms Catalog
        </button>
      </div>
    );
  }

  // Render Confirmation Receipt View
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Form Submitted Successfully!</h2>
          <p className="text-xs text-slate-600 max-w-md">
            {form.successMessage || 'Your submission has been securely registered into the organization queue.'}
          </p>
        </div>

        {/* Reference & SLA Box */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <span className="text-xs font-semibold text-slate-500">Tracking Reference Number</span>
            <span className="text-sm font-mono font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {submissionResult.referenceNumber}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Assigned Organization</span>
            <span className="font-bold text-slate-800">{form.organizationName}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">SLA Guaranteed Response</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Within {form.slaHours} Hours
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">SMS Confirmation Dispatched</span>
            <span className="font-semibold text-slate-700">{citizenPhone}</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/citizen/requests/${submissionResult.caseId}`)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Two-Way Official Chat & Track Case</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/citizen/requests')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              My Requests List
            </button>

            <button
              type="button"
              onClick={() => navigate('/citizen/forms')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Explore More Forms
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/citizen/forms')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {form.category}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {form.slaHours}h SLA Resolution
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">
            Official Submission to {form.organizationName}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {form.description}
            </p>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
        {/* Section 1: Submitter Contact Information */}
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            1. Applicant Contact Verification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone (SMS Alerts) *</label>
              <input
                type="tel"
                required
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                placeholder="+91 94940 12345"
                className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Form Fields */}
        <div className="space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            2. Request Details & Questionnaire
          </h3>

          <div className="space-y-4">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                </div>

                {/* Short Text */}
                {field.type === 'text' && (
                  <input
                    type="text"
                    required={field.required}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}

                {/* Long Textarea */}
                {field.type === 'textarea' && (
                  <textarea
                    rows={3}
                    required={field.required}
                    placeholder={field.placeholder || `Provide detailed explanation...`}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}

                {/* Select Dropdown */}
                {field.type === 'select' && (
                  <select
                    required={field.required}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select an option...</option>
                    {(field.options || []).map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* Radio Cards */}
                {field.type === 'radio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(field.options || []).map((opt, i) => {
                      const isChecked = answers[field.name] === opt;
                      return (
                        <label
                          key={i}
                          className={cn(
                            'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all',
                            isChecked
                              ? 'bg-blue-50/70 border-blue-500 text-blue-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={opt}
                            checked={isChecked}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Checkboxes */}
                {field.type === 'checkbox' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(field.options || []).map((opt, i) => {
                      const isChecked = ((answers[field.name] as string[]) || []).includes(opt);
                      return (
                        <label
                          key={i}
                          className={cn(
                            'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all',
                            isChecked
                              ? 'bg-blue-50/70 border-blue-500 text-blue-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxToggle(field.name, opt)}
                            className="text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Number */}
                {field.type === 'number' && (
                  <input
                    type="number"
                    required={field.required}
                    placeholder={field.placeholder || 'e.g. 10'}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                  />
                )}

                {/* Date */}
                {field.type === 'date' && (
                  <input
                    type="date"
                    required={field.required}
                    value={answers[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                  />
                )}

                {/* Star Rating */}
                {field.type === 'rating' && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleInputChange(field.name, star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={cn(
                            'w-6 h-6',
                            (answers[field.name] || 5) >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          )}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-600 ml-2">
                      {answers[field.name] || 5} / 5
                    </span>
                  </div>
                )}

                {/* Location Input */}
                {field.type === 'location' && (
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || 'Enter street address, colony, landmark, PIN code...'}
                      value={locationValue || answers[field.name] || ''}
                      onChange={(e) => {
                        setLocationValue(e.target.value);
                        handleInputChange(field.name, e.target.value);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* File Upload Field */}
                {field.type === 'file' && (
                  <div className="space-y-2">
                    <label className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-400 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Click to attach photo or PDF proof</span>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-1">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                            <span className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                              {f.name}
                            </span>
                            <span className="text-[10px] text-slate-400">Attached</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {field.helpText && (
                  <span className="text-[10px] text-slate-500 block">{field.helpText}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit CTA */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-[11px] text-slate-500">
            By submitting, you agree to official communication & SMS status updates.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{form.submitButtonText || 'Submit Form to Authority'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
