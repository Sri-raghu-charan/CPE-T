import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Alert,
} from '../../design-system/index.js';
import {
  ArrowLeft,
  FileQuestion,
  AlertCircle,
  Building2,
  HeartHandshake,
  Send,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { CaseType, CasePriority } from '../../types/case.js';

interface OrganizationOption {
  _id: string;
  name: string;
  category: string;
  type: string;
}

export const CitizenNewRequest: React.FC<{ defaultType?: CaseType }> = ({ defaultType }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const queryType = (searchParams.get('type') as CaseType) || defaultType || 'SERVICE_REQUEST';

  const [type, setType] = useState<CaseType>(queryType);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Form state
  const [organizationId, setOrganizationId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<CasePriority>('MEDIUM');
  const [description, setDescription] = useState('');
  const [productService, setProductService] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // Structured data fields
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsNeeded, setUnitsNeeded] = useState('1');
  const [hospitalName, setHospitalName] = useState('');
  const [patientName, setPatientName] = useState('');

  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [civicWard, setCivicWard] = useState('');

  // Domain specific fields
  const [targetType, setTargetType] = useState('PRODUCT');
  const [targetName, setTargetName] = useState('');
  const [complaintType, setComplaintType] = useState('Billing Dispute');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [disputedAmount, setDisputedAmount] = useState('');
  const [issueType, setIssueType] = useState('Periodic Maintenance Service');
  const [brand, setBrand] = useState('');
  const [urgency, setUrgency] = useState('CRITICAL_IMMEDIATE');
  const [requesterRelationship, setRequesterRelationship] = useState('FAMILY');
  const [attendantPhone, setAttendantPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch('/api/v1/organizations');
        if (res.ok) {
          const json = await res.json();
          setOrganizations(json.data || []);
          if (json.data && json.data.length > 0) {
            setOrganizationId(json.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load organizations', err);
      } finally {
        setLoadingOrgs(false);
      }
    }
    fetchOrganizations();
  }, []);

  // Update default categories and priorities based on case type
  useEffect(() => {
    if (type === 'BLOOD_REQUEST') {
      setCategory('Emergency Blood Requirement');
      setPriority('URGENT');
    } else if (type === 'COMPLAINT') {
      setCategory('Consumer Grievance');
      setPriority('HIGH');
    } else if (type === 'GRIEVANCE') {
      setCategory('Public Administration & Civic');
      setPriority('HIGH');
    } else if (type === 'SERVICE_REQUEST') {
      setCategory('Consumer Appliance & Utilities');
      setPriority('MEDIUM');
    } else if (type === 'SUPPORT_REQUEST') {
      setCategory('Technical Assistance');
      setPriority('MEDIUM');
    } else if (type === 'FEEDBACK') {
      setCategory('Public Service Quality');
      setPriority('LOW');
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      setErrorMsg('Please select a target organization.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // Build polymorphic structuredData payload
    const structuredData: Record<string, any> = {};
    if (type === 'BLOOD_REQUEST') {
      structuredData.bloodGroup = bloodGroup;
      structuredData.unitsNeeded = Number(unitsNeeded) || 1;
      structuredData.hospitalName = hospitalName;
      structuredData.patientName = patientName;
      structuredData.urgency = urgency;
      structuredData.requesterRelationship = requesterRelationship;
      structuredData.contactPhone = attendantPhone || '+91 9876543210';
    } else if (type === 'SERVICE_REQUEST') {
      structuredData.issueType = issueType;
      if (brand) structuredData.brand = brand;
      if (serialNumber) structuredData.serialNumber = serialNumber;
      if (purchaseDate) structuredData.purchaseDate = purchaseDate;
    } else if (type === 'COMPLAINT') {
      structuredData.targetType = targetType;
      structuredData.targetName = targetName || title;
      structuredData.complaintType = complaintType;
      structuredData.incidentDate = incidentDate;
      if (disputedAmount) structuredData.disputedAmount = disputedAmount;
      if (invoiceNumber) structuredData.invoiceNumber = invoiceNumber;
    } else if (type === 'GRIEVANCE') {
      structuredData.civicWard = civicWard || 'Ward 104';
      structuredData.grievanceType = 'Pothole Repair';
    }

    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          title,
          description,
          category,
          productService: productService || undefined,
          organizationId,
          priority,
          structuredData,
          location: city || address ? { city, address, pincode } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit case.');
      }

      navigate(`/citizen/requests/${data.data._id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const caseTypeOptions = [
    { value: 'SERVICE_REQUEST', label: 'Service Request', icon: FileQuestion },
    { value: 'COMPLAINT', label: 'Official Complaint', icon: AlertCircle },
    { value: 'GRIEVANCE', label: 'Civic Grievance', icon: Building2 },
    { value: 'BLOOD_REQUEST', label: 'Emergency Blood', icon: HeartHandshake },
    { value: 'SUPPORT_REQUEST', label: 'Support Request', icon: HelpCircle },
    { value: 'FEEDBACK', label: 'Feedback / Suggestion', icon: MessageSquare },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/citizen/requests"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Requests</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Raise New Request or Grievance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Universal intake engine — routes to verified public and private organizations with enforceable SLAs.
        </p>
      </div>

      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {/* Case Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Step 1: Select Case Classification
          </CardTitle>
          <CardDescription>
            All case types are managed under CPET's single universal tracking architecture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {caseTypeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value as CaseType)}
                  className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-700'}`} />
                  </div>
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Step 2: Case Details & Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organization Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Organization <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  disabled={loadingOrgs}
                >
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name} ({org.category} — {org.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CasePriority)}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="LOW">Low (72-hour SLA)</option>
                  <option value="MEDIUM">Medium (48-hour SLA)</option>
                  <option value="HIGH">High (24-hour SLA)</option>
                  <option value="URGENT">Urgent (12-hour Priority SLA)</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Case Title / Subject <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g., Defective transformer power surge or Billing dispute"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category & Product */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category Classification <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g., Electrical Utilities, Healthcare, Transit"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Specific Product / Service Name
                </label>
                <Input
                  placeholder="e.g., Transformer Model X-1, Metro Bus #42"
                  value={productService}
                  onChange={(e) => setProductService(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Type-Specific Fields */}
            {type === 'BLOOD_REQUEST' && (
              <div className="p-4 rounded-lg bg-red-50/50 border border-red-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-900 uppercase tracking-wider">
                    <HeartHandshake className="w-4 h-4 text-red-600" />
                    Emergency Blood Requirement Details
                  </div>
                  <Link
                    to="/citizen/blood"
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline flex items-center gap-1"
                  >
                    Open 5-Level Proximity Hub →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Units Needed
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={unitsNeeded}
                      onChange={(e) => setUnitsNeeded(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital Name
                    </label>
                    <Input
                      placeholder="e.g. City Trauma Center"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Name
                    </label>
                    <Input
                      placeholder="Patient name / ID"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency Level</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    >
                      <option value="CRITICAL_IMMEDIATE">CRITICAL_IMMEDIATE (Surgery / ICU)</option>
                      <option value="WITHIN_24_HOURS">WITHIN_24_HOURS</option>
                      <option value="SCHEDULED_DATE">SCHEDULED_DATE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship to Patient</label>
                    <select
                      value={requesterRelationship}
                      onChange={(e) => setRequesterRelationship(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    >
                      <option value="FAMILY">Family Member</option>
                      <option value="SELF">Self</option>
                      <option value="ATTENDANT">Attendant</option>
                      <option value="HOSPITAL_STAFF">Hospital Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Attendant Phone</label>
                    <Input
                      placeholder="+91 9876543210"
                      value={attendantPhone}
                      onChange={(e) => setAttendantPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'SERVICE_REQUEST' && (
              <div className="p-4 rounded-lg bg-blue-50/40 border border-blue-200 space-y-4">
                <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Service Request Details & Appliance Metadata
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Service / Fault Type
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    >
                      <option value="Periodic Maintenance Service">Periodic Maintenance Service</option>
                      <option value="Cooling Defect / Gas Check">Cooling Defect / Gas Check</option>
                      <option value="Defective Compressor">Defective Compressor</option>
                      <option value="Water Leakage">Water Leakage</option>
                      <option value="Electrical / Power Failure">Electrical / Power Failure</option>
                      <option value="Installation / Relocation">Installation / Relocation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brand / Manufacturer
                    </label>
                    <Input
                      placeholder="e.g. Lloyd, Samsung, LG, Voltas, Apex"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Serial Number
                    </label>
                    <Input
                      placeholder="e.g. SN-8899201"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Purchase Date
                    </label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'COMPLAINT' && (
              <div className="p-4 rounded-lg bg-amber-50/40 border border-amber-200 space-y-4">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Universal Complaint Configuration & Target Entity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Entity Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    >
                      <option value="PRODUCT">Product (Hardware / Appliance)</option>
                      <option value="SERVICE">Service (Technician / Warranty SLA)</option>
                      <option value="ORGANIZATION">Organization (Corporate Vendor / Utility)</option>
                      <option value="INSTITUTION">Institution (Hospital / University / Bank)</option>
                      <option value="FACILITY">Facility (Transit / Terminal / Public Plant)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Name / Subject Entity <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. City Trauma Hospital / Route 42 Bus Transit"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complaint Nature
                    </label>
                    <select
                      value={complaintType}
                      onChange={(e) => setComplaintType(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    >
                      <option value="Billing Dispute">Billing Dispute / Tariff</option>
                      <option value="Warranty Refusal">Warranty Refusal</option>
                      <option value="Service Delay / SLA Breach">Service Delay / SLA Breach</option>
                      <option value="Defective Goods">Defective Goods</option>
                      <option value="Harassment / Misconduct">Harassment / Misconduct</option>
                      <option value="Facility Non-Functioning">Facility Non-Functioning</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Incident
                    </label>
                    <Input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Disputed Financial Amount
                    </label>
                    <Input
                      placeholder="e.g. ₹ 4,500"
                      value={disputedAmount}
                      onChange={(e) => setDisputedAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice, Account, or Reference Number
                  </label>
                  <Input
                    placeholder="e.g. INV-2026-9901 or Account #3412"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>
            )}

            {type === 'GRIEVANCE' && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Civic Administration Jurisdiction
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Civic Ward / Municipal Zone
                  </label>
                  <Input
                    placeholder="e.g. Ward 14, Central District"
                    value={civicWard}
                    onChange={(e) => setCivicWard(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detailed Description & Incident Facts <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Provide complete facts, dates, times, and steps taken so the organization can investigate..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                <Input
                  placeholder="e.g. Metro City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Street</label>
                <Input
                  placeholder="Street or Landmark"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                <Input
                  placeholder="e.g. 500001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Link to="/citizen/requests">
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Request to Organization
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
