import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  MapPin,
  Send,
  MessageSquare,
  LogIn,
  Paperclip,
} from 'lucide-react';
import { DynamicForm } from '../../types/form.js';
import { fetchFormByIdOrSlug, submitDynamicForm } from '../../services/forms.js';
import { cn } from '../../design-system/utils.js';

export const PublicFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Field Answers
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; type: string; size: number }>>([]);
  const [locationValue, setLocationValue] = useState('');

  // Submitter details
  const [citizenName, setCitizenName] = useState(user?.name || '');
  const [citizenEmail, setCitizenEmail] = useState(user?.email || '');
  const [citizenPhone, setCitizenPhone] = useState(user?.phoneNumber || user?.phone || '');

  // Submission Result
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const loadForm = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchFormByIdOrSlug(id, token);
      setForm(data);

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
      setErrorMsg(err.message || 'Form unavailable');
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

    // Contact details check
    if (!citizenName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!citizenPhone.trim()) {
      setErrorMsg('Please enter your mobile phone number for SMS tracking');
      return;
    }

    // Required fields check
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
          name: citizenName.trim(),
          email: citizenEmail.trim() || undefined,
          phone: citizenPhone.trim(),
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
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <span className="text-xs font-medium text-slate-500">Loading official form...</span>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Form Not Available</h2>
          <p className="text-xs text-slate-500">This online form link is inactive or has expired.</p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            Go to CPET Gateway
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 font-sans antialiased py-10 px-4">
      {/* Top Brand Bar */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-base tracking-tight text-slate-900 block leading-tight">
              CPET Official Portal
            </span>
            <span className="text-[10px] text-slate-500 block">Direct Public Form Gateway</span>
          </div>
        </Link>

        {!user && (
          <Link
            to="/citizen/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Citizen Sign In</span>
          </Link>
        )}
      </div>

      {submissionResult ? (
        /* Submission Success Receipt */
        <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Submission Confirmed!</h2>
            <p className="text-xs text-slate-600 max-w-md">
              {form.successMessage || 'Your form answers have been submitted directly to the authority queue.'}
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-xs font-semibold text-slate-500">Official Tracking Code</span>
              <span className="text-sm font-mono font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                {submissionResult.referenceNumber}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Assigned Organization</span>
              <span className="font-bold text-slate-800">{form.organizationName}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Guaranteed SLA Window</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Within {form.slaHours} Hours
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">SMS Dispatch To</span>
              <span className="font-semibold text-slate-700">{citizenPhone}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {user ? (
              <button
                type="button"
                onClick={() => navigate(`/citizen/requests/${submissionResult.caseId}`)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Two-Way Chat & Track in Citizen Dashboard</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-between gap-3 text-xs text-blue-900">
                <div>
                  <span className="font-bold block">Save this reference for SMS tracking</span>
                  <span className="text-[11px] text-blue-700">You will receive SMS alerts as status changes.</span>
                </div>
                <Link
                  to="/citizen/login"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shrink-0"
                >
                  Log In to View
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Form Card */
        <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {form.category}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {form.slaHours}h Target SLA
              </span>
            </div>

            <div className="pt-1">
              <span className="text-xs font-bold text-slate-400 block">
                Official Form • {form.organizationName}
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {form.title}
              </h1>
            </div>

            {form.description && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mt-2">
                {form.description}
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Citizen Details */}
            <div className="space-y-3.5 border-b border-slate-100 pb-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Applicant Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="Legal name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone (for SMS updates) *</label>
                  <input
                    type="tel"
                    required
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    placeholder="+91 94940 12345"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={citizenEmail}
                  onChange={(e) => setCitizenEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Form Questionnaire
              </h3>

              {form.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

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

                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder || `Provide details...`}
                      value={answers[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={answers[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    >
                      <option value="">Select option...</option>
                      {(field.options || []).map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

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
                              className="text-blue-600"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

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

                  {field.type === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={answers[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  )}

                  {field.type === 'location' && (
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required={field.required}
                        placeholder={field.placeholder || 'Address, Street, Landmark, PIN code...'}
                        value={locationValue || answers[field.name] || ''}
                        onChange={(e) => {
                          setLocationValue(e.target.value);
                          handleInputChange(field.name, e.target.value);
                        }}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                      />
                    </div>
                  )}

                  {field.type === 'file' && (
                    <div className="space-y-2">
                      <label className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-400 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Click to upload document or photo</span>
                        <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
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

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
      )}
    </div>
  );
};
