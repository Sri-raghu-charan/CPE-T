import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings,
  Eye,
  Save,
  CheckCircle2,
  ArrowLeft,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Hash,
  Calendar,
  Upload,
  Star,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { FormField, FormFieldType, DynamicForm } from '../../types/form.js';
import { createForm, updateForm, fetchFormByIdOrSlug } from '../../services/forms.js';
import { cn } from '../../design-system/utils.js';

interface PaletteItem {
  type: FormFieldType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const FIELD_PALETTE: PaletteItem[] = [
  { type: 'text', label: 'Short Text', icon: Type, description: 'Single line text for names, IDs, serial numbers' },
  { type: 'textarea', label: 'Long Description', icon: AlignLeft, description: 'Multi-line text for grievances & explanations' },
  { type: 'select', label: 'Dropdown Select', icon: List, description: 'Single option selection from a dropdown list' },
  { type: 'radio', label: 'Radio Choice', icon: CheckSquare, description: 'Single choice from visible radio cards' },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare, description: 'Multiple choices or confirmation tick' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Quantity, amount, meter load, or metric value' },
  { type: 'date', label: 'Date Picker', icon: Calendar, description: 'Select appointment date or incident date' },
  { type: 'file', label: 'File / Document Upload', icon: Upload, description: 'Attach bills, invoices, photos, and PDFs' },
  { type: 'rating', label: 'Star Rating', icon: Star, description: '1 to 5 star rating or severity level' },
  { type: 'location', label: 'Location & Address', icon: MapPin, description: 'Premises address with landmark & postal code' },
];

export const OrgFormBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const isEditing = Boolean(id && id !== 'new');

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<DynamicForm | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form Meta State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Public Utilities');
  const [department, setDepartment] = useState('');
  const [slaHours, setSlaHours] = useState<number>(24);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [isPublic, setIsPublic] = useState(true);
  const [submitButtonText, setSubmitButtonText] = useState('Submit Application');
  const [successMessage, setSuccessMessage] = useState('Your application has been received and routed to our team.');

  // Fields State
  const [fields, setFields] = useState<FormField[]>([
    {
      id: 'f-1',
      name: 'applicantName',
      label: 'Applicant Full Name',
      type: 'text',
      placeholder: 'Enter full legal name',
      required: true,
      order: 0,
    },
    {
      id: 'f-2',
      name: 'issueCategory',
      label: 'Service / Fault Category',
      type: 'select',
      options: ['Urgent Repair', 'Maintenance Inspection', 'Warranty Claim', 'Billing Grievance'],
      required: true,
      order: 1,
    },
    {
      id: 'f-3',
      name: 'issueDescription',
      label: 'Detailed Description of Request',
      type: 'textarea',
      placeholder: 'Explain the issue in detail...',
      required: true,
      order: 2,
    },
  ]);

  // Selected field for property inspector
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>('f-1');

  // Preview form test state
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadExistingForm() {
      if (!isEditing || !id) return;
      try {
        setLoading(true);
        const form = await fetchFormByIdOrSlug(id, token);
        setTitle(form.title);
        setDescription(form.description || '');
        setCategory(form.category);
        setDepartment(form.department || '');
        setSlaHours(form.slaHours || 24);
        setPriority(form.priority || 'MEDIUM');
        setIsPublic(form.isPublic !== false);
        setSubmitButtonText(form.submitButtonText || 'Submit Application');
        setSuccessMessage(form.successMessage || 'Form submitted successfully');
        if (form.fields && form.fields.length > 0) {
          setFields(form.fields);
          setSelectedFieldId(form.fields[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    loadExistingForm();
  }, [id, isEditing, token]);

  const handleAddField = (type: FormFieldType) => {
    const newFieldId = `f-${Date.now()}`;
    const count = fields.length + 1;
    const defaultLabel = `${type.charAt(0).toUpperCase() + type.slice(1)} Field ${count}`;
    const defaultName = `field_${Date.now().toString().slice(-4)}`;

    const newField: FormField = {
      id: newFieldId,
      name: defaultName,
      label: defaultLabel,
      type,
      placeholder: '',
      helpText: '',
      required: false,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      order: fields.length,
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newFieldId);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleDeleteField = (fieldId: string) => {
    if (fields.length <= 1) {
      alert('Form must contain at least 1 field.');
      return;
    }
    const updated = fields.filter((f) => f.id !== fieldId);
    setFields(updated);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(updated[0]?.id || null);
    }
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFields(updated.map((f, idx) => ({ ...f, order: idx })));
  };

  const handleAddOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const existing = field.options || [];
    const newOption = `Option ${existing.length + 1}`;
    handleUpdateField(fieldId, { options: [...existing, newOption] });
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, val: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const updated = [...field.options];
    updated[optIndex] = val;
    handleUpdateField(fieldId, { options: updated });
  };

  const handleDeleteOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options || field.options.length <= 1) return;
    const updated = field.options.filter((_, idx) => idx !== optIndex);
    handleUpdateField(fieldId, { options: updated });
  };

  const handleSaveForm = async (status: 'PUBLISHED' | 'DRAFT') => {
    if (!token) return;
    if (!title.trim()) {
      setErrorMsg('Please enter a Form Title before saving.');
      return;
    }
    if (fields.length === 0) {
      setErrorMsg('Please add at least one field to the form.');
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    try {
      const payload: Partial<DynamicForm> = {
        title: title.trim(),
        description: description.trim(),
        category,
        department: department.trim() || undefined,
        slaHours: Number(slaHours) || 24,
        priority,
        isPublic,
        status,
        submitButtonText,
        successMessage,
        fields,
      };

      let result: DynamicForm;
      if (isEditing && id) {
        result = await updateForm(id, payload, token);
      } else {
        result = await createForm(payload, token);
      }

      setSuccessResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500 mt-3">Loading Form Studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/organization/forms')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {isEditing ? 'Form Studio Edit Mode' : 'Form Studio Creator'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                {fields.length} Fields
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {title || 'Untitled Dynamic Form'}
            </h1>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'preview'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveForm('DRAFT')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveForm('PUBLISHED')}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Save & Publish' : 'Publish to Citizens'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Modal / Banner */}
      {successResult && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black">Form Published Successfully!</h3>
                <p className="text-xs text-emerald-100">
                  Form is live and now discovering inside Citizen Dashboard & Public Gateway.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
              className="text-white/80 hover:text-white text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/forms/${successResult.slug || successResult._id}`}
              className="w-full bg-white/20 text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/forms/${successResult.slug || successResult._id}`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2500);
              }}
              className="px-4 py-2 rounded-lg bg-white text-emerald-800 text-xs font-bold shrink-0 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Shareable Link'}</span>
            </button>
            <a
              href={`/forms/${successResult.slug || successResult._id}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Public Page</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Studio Body */}
      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 1. Left Column: Field Palette & General Settings (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            {/* General Form Settings */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                Form Settings
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Form Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., AC Service & Compressor Claim"
                    className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Public Utilities">Public Utilities</option>
                    <option value="Consumer Goods">Consumer Goods & Electronics</option>
                    <option value="Municipal & Civic Services">Municipal & Civic Services</option>
                    <option value="Healthcare SOS">Healthcare & Blood SOS</option>
                    <option value="Banking & Financial Redressal">Banking & Financial</option>
                    <option value="Education & Campus Grievance">Education & Campus</option>
                    <option value="General Services">General Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Technical Field Service"
                    className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">SLA Target (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={slaHours}
                      onChange={(e) => setSlaHours(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instructions / Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly guide citizen submitters on required documents or visit conditions..."
                    className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Public Link Access</span>
                    <span className="text-[10px] text-slate-500">Allow direct anonymous/online submissions</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Field Palette */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                Add Field Palette
              </h3>
              <p className="text-[11px] text-slate-500">Click any field block to insert it into the form canvas:</p>

              <div className="grid grid-cols-1 gap-1.5">
                {FIELD_PALETTE.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleAddField(item.type)}
                      className="w-full p-2 rounded-xl text-left bg-slate-50 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-300 transition-all flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white group-hover:bg-blue-600 group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 group-hover:border-transparent transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Middle Column: Visual Canvas (6 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Form Canvas Fields</h3>
                  <p className="text-xs text-slate-500">Reorder, select to inspect properties, or delete.</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                  {fields.length} Active Field{fields.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Field Cards */}
              <div className="space-y-2.5">
                {fields.map((field, idx) => {
                  const isSelected = field.id === selectedFieldId;
                  const paletteMeta = FIELD_PALETTE.find((p) => p.type === field.type);
                  const Icon = paletteMeta?.icon || Type;

                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={cn(
                        'p-4 rounded-xl border transition-all cursor-pointer relative group',
                        isSelected
                          ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {field.label || 'Untitled Field'}
                              </span>
                              {field.required && (
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              name: {field.name} • type: {field.type}
                            </span>
                          </div>
                        </div>

                        {/* Reorder & Action buttons */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveField(idx, 'up')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === fields.length - 1}
                            onClick={() => handleMoveField(idx, 'down')}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteField(field.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Options Preview for select/radio */}
                      {field.options && field.options.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex flex-wrap gap-1.5">
                          {field.options.map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Field Bottom Quick Button */}
              <button
                type="button"
                onClick={() => handleAddField('text')}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Text Field</span>
              </button>
            </div>
          </div>

          {/* 3. Right Column: Field Property Inspector (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {selectedField ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Field Inspector</h3>
                    <p className="text-[11px] text-slate-500">Configure properties for {selectedField.label}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedField.type}
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Field Label *</label>
                    <input
                      type="text"
                      value={selectedField.label}
                      onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Variable Name (Key)</label>
                    <input
                      type="text"
                      value={selectedField.name}
                      onChange={(e) => handleUpdateField(selectedField.id, { name: e.target.value.replace(/\s+/g, '_') })}
                      className="w-full px-3 py-2 bg-slate-50 text-xs font-mono text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Placeholder Text</label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                      placeholder="e.g. Enter details..."
                      className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Help Text / Instruction</label>
                    <input
                      type="text"
                      value={selectedField.helpText || ''}
                      onChange={(e) => handleUpdateField(selectedField.id, { helpText: e.target.value })}
                      placeholder="Guidance shown beneath input..."
                      className="w-full px-3 py-2 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Required Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Required Field</span>
                      <span className="text-[10px] text-slate-500">Citizen cannot submit without filling</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) => handleUpdateField(selectedField.id, { required: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Choice Options Editor (for select, radio, checkbox) */}
                  {(selectedField.type === 'select' ||
                    selectedField.type === 'radio' ||
                    selectedField.type === 'checkbox') && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Choice Options</label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(selectedField.id)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Option
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(selectedField.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(selectedField.id, optIdx, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-lg border border-slate-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(selectedField.id, optIdx)}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                Select a field on the canvas to inspect and customize its properties.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {category}
              </span>
              {department && (
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {department}
                </span>
              )}
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                ⏱ {slaHours}h SLA Resolution
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{title || 'Form Preview Title'}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {description || 'Please provide required information accurately for swift resolution.'}
            </p>
          </div>

          {/* Render Preview Fields */}
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    placeholder={field.placeholder || 'Enter value...'}
                    value={previewValues[field.name] || ''}
                    onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder || 'Describe details...'}
                    value={previewValues[field.name] || ''}
                    onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={previewValues[field.name] || ''}
                    onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
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

                {field.type === 'radio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(field.options || []).map((opt, i) => (
                      <label
                        key={i}
                        className={cn(
                          'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all',
                          previewValues[field.name] === opt
                            ? 'bg-blue-50/60 border-blue-500 text-blue-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        )}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={opt}
                          checked={previewValues[field.name] === opt}
                          onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    placeholder={field.placeholder || 'e.g. 10'}
                    value={previewValues[field.name] || ''}
                    onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                  />
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={previewValues[field.name] || ''}
                    onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                  />
                )}

                {field.type === 'file' && (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Click to upload document or photo</span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                  </div>
                )}

                {field.type === 'location' && (
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder={field.placeholder || 'Address, Street, Landmark, Pin code...'}
                      value={previewValues[field.name] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [field.name]: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 focus:outline-none"
                    />
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
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/20"
            >
              {submitButtonText || 'Submit Application'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
