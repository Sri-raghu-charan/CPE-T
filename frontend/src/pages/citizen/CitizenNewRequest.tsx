import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Alert, Input } from '../../design-system/index.js';
import {
  ArrowLeft,
  GraduationCap,
  ShieldAlert,
  ShoppingBag,
  Wifi,
  Landmark,
  Building2,
  Zap,
  Heart,
  Plane,
  Home,
  FileCheck,
  Tv,
  Search,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Info,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CaseType, CasePriority } from '../../types/case.js';
import { ALL_DOMAINS_DATA, DomainSection, ProviderOption } from '../../data/serviceProviders.js';

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  ShieldAlert,
  ShoppingBag,
  Wifi,
  Landmark,
  Building2,
  Zap,
  Heart,
  Plane,
  Home,
  FileCheck,
  Tv,
};

export const CitizenNewRequest: React.FC<{ defaultType?: CaseType }> = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const queryDomain = searchParams.get('domain') || searchParams.get('category') || '';
  const initialDomain = ALL_DOMAINS_DATA.find((d) => d.id === queryDomain.toLowerCase()) || ALL_DOMAINS_DATA[0];

  // Active Domain & Provider Selection
  const [activeDomain, setActiveDomain] = useState<DomainSection>(initialDomain);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption>(initialDomain.providers[0]);
  const [providerSearch, setProviderSearch] = useState('');

  // Universal Form States
  const [issueType, setIssueType] = useState(initialDomain.commonIssueTypes[0] || '');
  const [priority, setPriority] = useState<CasePriority>(initialDomain.defaultPriority);
  const [city, setCity] = useState('Rajahmundry');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic Domain-Specific States:
  // 1. Anti-Ragging & Education
  const [collegeName, setCollegeName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [hostelOrCampusLocation, setHostelOrCampusLocation] = useState('');
  const [perpetratorDetails, setPerpetratorDetails] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // 2. Cyber Crime
  const [suspectUrlOrPhone, setSuspectUrlOrPhone] = useState('');
  const [cyberDisputedAmount, setCyberDisputedAmount] = useState('');
  const [bankTxnRef, setBankTxnRef] = useState('');
  const [fraudDate, setFraudDate] = useState(new Date().toISOString().slice(0, 10));

  // 3. E-Commerce
  const [orderId, setOrderId] = useState('');
  const [productItemName, setProductItemName] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');

  // 4. Telecom & Broadband
  const [telecomNumber, setTelecomNumber] = useState('');
  const [connectionType, setConnectionType] = useState('Fiber Broadband');

  // 5. Banking
  const [accountLast4, setAccountLast4] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankingTxnAmount, setBankingTxnAmount] = useState('');

  // 6. Civic & Municipal
  const [civicWard, setCivicWard] = useState('Ward 104');
  const [landmark, setLandmark] = useState('');

  // 7. Electricity & Power
  const [consumerServiceNo, setConsumerServiceNo] = useState('');

  // 8. Healthcare & Blood
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsNeeded, setUnitsNeeded] = useState('1');
  const [hospitalName, setHospitalName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [attendantPhone, setAttendantPhone] = useState('');

  // 9. Travel & Transport
  const [pnrOrBookingId, setPnrOrBookingId] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));

  // 10. Real Estate & RERA
  const [projectName, setProjectName] = useState('');
  const [flatUnitNo, setFlatUnitNo] = useState('');
  const [reraRegNo, setReraRegNo] = useState('');

  // 11. Government Schemes
  const [applicationAckNo, setApplicationAckNo] = useState('');

  // 12. Appliances
  const [serialNumber, setSerialNumber] = useState('');
  const [modelNumber, setModelNumber] = useState('');

  // Handle Domain Change
  const handleDomainSelect = (domain: DomainSection) => {
    setActiveDomain(domain);
    setSelectedProvider(domain.providers[0]);
    setIssueType(domain.commonIssueTypes[0] || '');
    setPriority(domain.defaultPriority);
  };

  // Filter providers in active domain or search globally
  const filteredProviders = activeDomain.providers.filter(
    (p) =>
      p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.shortCode.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(providerSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    // Build structured data payload dynamically
    const structuredData: Record<string, any> = {
      domainId: activeDomain.id,
      domainTitle: activeDomain.title,
      providerId: selectedProvider.id,
      providerName: selectedProvider.name,
      providerCode: selectedProvider.shortCode,
      providerHelpline: selectedProvider.helpline,
      issueType,
      city,
    };

    if (activeDomain.id === 'antiragging') {
      structuredData.collegeName = collegeName;
      structuredData.studentRollNo = studentRollNo;
      structuredData.hostelLocation = hostelOrCampusLocation;
      structuredData.perpetratorDetails = perpetratorDetails;
      structuredData.isAnonymous = isAnonymous;
    } else if (activeDomain.id === 'cybercrime') {
      structuredData.suspectInfo = suspectUrlOrPhone;
      structuredData.disputedAmount = cyberDisputedAmount;
      structuredData.bankTxnRef = bankTxnRef;
      structuredData.fraudDate = fraudDate;
    } else if (activeDomain.id === 'ecommerce') {
      structuredData.orderId = orderId;
      structuredData.productName = productItemName;
      structuredData.invoiceAmount = invoiceAmount;
    } else if (activeDomain.id === 'telecom') {
      structuredData.telecomNumber = telecomNumber;
      structuredData.connectionType = connectionType;
    } else if (activeDomain.id === 'banking') {
      structuredData.accountLast4 = accountLast4;
      structuredData.bankBranch = bankBranch;
      structuredData.disputedAmount = bankingTxnAmount;
    } else if (activeDomain.id === 'municipal') {
      structuredData.civicWard = civicWard;
      structuredData.landmark = landmark;
    } else if (activeDomain.id === 'power') {
      structuredData.consumerServiceNo = consumerServiceNo;
    } else if (activeDomain.id === 'healthcare') {
      structuredData.bloodGroup = bloodGroup;
      structuredData.unitsNeeded = Number(unitsNeeded) || 1;
      structuredData.hospitalName = hospitalName;
      structuredData.patientName = patientName;
      structuredData.contactPhone = attendantPhone || '+91 9876543210';
    } else if (activeDomain.id === 'travel') {
      structuredData.pnrOrBookingId = pnrOrBookingId;
      structuredData.travelDate = travelDate;
    } else if (activeDomain.id === 'rera') {
      structuredData.projectName = projectName;
      structuredData.flatUnitNo = flatUnitNo;
      structuredData.reraRegNo = reraRegNo;
    } else if (activeDomain.id === 'govtwelfare') {
      structuredData.applicationAckNo = applicationAckNo;
    } else if (activeDomain.id === 'appliances') {
      structuredData.serialNumber = serialNumber;
      structuredData.modelNumber = modelNumber;
    }

    const payload = {
      type: activeDomain.id === 'healthcare' ? 'BLOOD_REQUEST' : activeDomain.id === 'appliances' ? 'SERVICE_REQUEST' : 'COMPLAINT',
      title: `${issueType} • ${selectedProvider.name}`,
      description:
        detailedDescription ||
        `Grievance submitted against ${selectedProvider.name} regarding ${issueType} at ${city}. Immediate SLA action requested.`,
      category: activeDomain.title,
      productService: selectedProvider.name,
      priority,
      structuredData,
      location: { city },
    };

    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        navigate(`/citizen/requests/${data.data._id || data.data.referenceNumber || 'mock-1'}`);
      } else {
        navigate('/citizen/requests');
      }
    } catch (err: any) {
      navigate('/citizen/requests');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      
      {/* Top Breadcrumb & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <Link
            to="/citizen/requests"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Requests</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Universal Intake & Grievance Engine</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              12+ Online Sectors
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            File official grievances, service bookings, and statutory complaints directly to verified authorities with enforceable SLAs.
          </p>
        </div>

        {/* AI Voice Assistant Quick Button */}
        <button
          type="button"
          onClick={() => navigate('/citizen/intake')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Describe via AI Voice</span>
        </button>
      </div>

      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {/* STEP 1: Interactive Sector / Domain Grid Selector */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Step 1: Choose Service Sector / Application Domain
            </h2>
            <p className="text-sm font-bold text-slate-800">
              Select what you need assistance with:
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600">
            {ALL_DOMAINS_DATA.length} Sectors Available
          </span>
        </div>

        {/* Domain Selection Tabs (Responsive Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {ALL_DOMAINS_DATA.map((domain) => {
            const isSelected = activeDomain.id === domain.id;
            const IconComponent = ICON_MAP[domain.iconName] || FileText;

            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleDomainSelect(domain)}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500/30'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-700 shadow-xs group-hover:scale-105 transition-transform'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                </div>

                <div>
                  <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {domain.shortLabel}
                  </div>
                  <div
                    className={`text-[10px] font-normal leading-tight mt-0.5 truncate ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {domain.providers.length} Providers
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Main Form & Live SLA Summary (2-Column Desktop Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: The Dynamic Domain Form (7 Cols on Desktop) */}
        <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Active Domain Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-300 uppercase">
                    {activeDomain.shortLabel}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">{activeDomain.badge}</span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1">
                  {activeDomain.title}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {activeDomain.description}
                </p>
              </div>

              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-center text-xs font-semibold">
                <span className="text-[10px] text-slate-400 block font-normal">Standard SLA</span>
                <span className="text-emerald-400 font-bold">{activeDomain.defaultSlaHours}h Resolution</span>
              </div>
            </div>

            {/* Provider Directory Selector within Domain */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Select Specific Authority / Service Provider ({activeDomain.providers.length} Listed)</span>
                </label>
              </div>

              {/* Search within providers */}
              {activeDomain.providers.length > 4 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder={`Search in ${activeDomain.shortLabel} providers...`}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              {/* Provider Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredProviders.map((provider) => {
                  const isProvSelected = selectedProvider.id === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => setSelectedProvider(provider)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isProvSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{provider.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{provider.category} • Helpline: {provider.helpline}</div>
                      </div>
                      {isProvSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Common Issue Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Issue / Grievance Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {activeDomain.commonIssueTypes.map((issue, idx) => (
                  <option key={idx} value={issue}>
                    {issue}
                  </option>
                ))}
              </select>
            </div>

            {/* ============================================================= */}
            {/* DYNAMIC FORM SECTION BY DOMAIN TYPE                           */}
            {/* ============================================================= */}

            {/* 1. ANTI-RAGGING & EDUCATION CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'ANTIRAGGING' && (
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-4">
                <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                  <GraduationCap className="w-4 h-4 text-rose-600" />
                  <span>Anti-Ragging Statutory Confidential Intake</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      College / University Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. JNTU Kakinada / Hyderabad Central Univ"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Roll Number / Enrollment ID
                    </label>
                    <Input
                      placeholder="e.g. 23011A0501"
                      value={studentRollNo}
                      onChange={(e) => setStudentRollNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus / Hostel Block Location <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Boys Hostel Block C, Room 204"
                      value={hostelOrCampusLocation}
                      onChange={(e) => setHostelOrCampusLocation(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Perpetrator Info / Seniors / Faculty (if known)
                    </label>
                    <Input
                      placeholder="Names, year or unknown seniors"
                      value={perpetratorDetails}
                      onChange={(e) => setPerpetratorDetails(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Keep My Identity Anonymous (Protected under UGC Anti-Ragging Whistleblower Guidelines)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* 2. CYBER CRIME CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'CYBERCRIME' && (
              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 space-y-4">
                <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>National Cyber Crime 1930 Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Suspect Mobile Number / Phishing Website / Social Handle
                    </label>
                    <Input
                      placeholder="e.g. +91 9812345678 or fake-upi.xyz"
                      value={suspectUrlOrPhone}
                      onChange={(e) => setSuspectUrlOrPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Disputed / Defrauded Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="number"
                      placeholder="e.g. 25000"
                      value={cyberDisputedAmount}
                      onChange={(e) => setCyberDisputedAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bank Transaction UTR / Ref Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. UPI/4289104810 or IMPS Ref"
                      value={bankTxnRef}
                      onChange={(e) => setBankTxnRef(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Incident Date
                    </label>
                    <Input
                      type="date"
                      value={fraudDate}
                      onChange={(e) => setFraudDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. E-COMMERCE CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'ECOMMERCE' && (
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 space-y-4">
                <div className="flex items-center gap-2 text-orange-800 text-xs font-bold">
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                  <span>E-Commerce Order & Return Dispute</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Order / Tracking ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. 408-98214-98124"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Product / Food Item Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Wireless Headphones / Grocery Order"
                      value={productItemName}
                      onChange={(e) => setProductItemName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Invoice Value (₹) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="number"
                      placeholder="e.g. 3499"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. TELECOM & FIBER CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'TELECOM' && (
              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-4">
                <div className="flex items-center gap-2 text-cyan-800 text-xs font-bold">
                  <Wifi className="w-4 h-4 text-cyan-600" />
                  <span>Telecom & Fiber Broadband Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Mobile / Fiber Account No <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. 9876543210 or 0883-248104"
                      value={telecomNumber}
                      onChange={(e) => setTelecomNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Connection Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={connectionType}
                      onChange={(e) => setConnectionType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Fiber Broadband">Fiber Broadband (FTTH)</option>
                      <option value="5G Mobile Prepaid">5G Mobile Prepaid</option>
                      <option value="Postpaid Mobile Billing">Postpaid Mobile Billing</option>
                      <option value="DTH Satellite TV">DTH Satellite TV</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BANKING & UPI CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'BANKING' && (
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-4">
                <div className="flex items-center gap-2 text-teal-800 text-xs font-bold">
                  <Landmark className="w-4 h-4 text-teal-600" />
                  <span>Banking & Electronic Journal Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account / Card Last 4 Digits <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      maxLength={4}
                      placeholder="e.g. 4482"
                      value={accountLast4}
                      onChange={(e) => setAccountLast4(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Disputed Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="number"
                      placeholder="e.g. 5000"
                      value={bankingTxnAmount}
                      onChange={(e) => setBankingTxnAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch / ATM Location
                    </label>
                    <Input
                      placeholder="e.g. Main Road Branch"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. HEALTHCARE & EMERGENCY BLOOD CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'HEALTHCARE' && (
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-4">
                <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <span>Emergency Hospital & Blood Coordination</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Required Blood Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Units Needed <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="number"
                      min="1"
                      max="10"
                      value={unitsNeeded}
                      onChange={(e) => setUnitsNeeded(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital / Trauma Center <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. City Trauma Hospital"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Name
                    </label>
                    <Input
                      placeholder="e.g. Ramesh V."
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Attendant Phone <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="+91 9876543210"
                      value={attendantPhone}
                      onChange={(e) => setAttendantPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. TRAVEL & RAILWAYS CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'TRAVEL' && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-4">
                <div className="flex items-center gap-2 text-indigo-800 text-xs font-bold">
                  <Plane className="w-4 h-4 text-indigo-600" />
                  <span>Travel Ticket & Passenger Rights Claim</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PNR / Flight No / Booking ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. PNR-4819024 or 6E-204"
                      value={pnrOrBookingId}
                      onChange={(e) => setPnrOrBookingId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Journey Date
                    </label>
                    <Input
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. RERA & REAL ESTATE CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'RERA' && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <Home className="w-4 h-4 text-emerald-600" />
                  <span>Real Estate & RERA Tribunal Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Project / Society Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Green Valley Heights"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Flat / Unit Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Flat 402, Tower B"
                      value={flatUnitNo}
                      onChange={(e) => setFlatUnitNo(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RERA Registration No
                    </label>
                    <Input
                      placeholder="e.g. P02400001890"
                      value={reraRegNo}
                      onChange={(e) => setReraRegNo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 9. GOVT WELFARE SCHEMES CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'GOVT_WELFARE' && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 text-blue-800 text-xs font-bold">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Government Application Tracking</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application / Enrolment / UAN Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. EID 2048/98124/10492 or UAN 10098481024"
                    value={applicationAckNo}
                    onChange={(e) => setApplicationAckNo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* 10. CONSUMER APPLIANCES CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'APPLIANCES' && (
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-4">
                <div className="flex items-center gap-2 text-sky-800 text-xs font-bold">
                  <Tv className="w-4 h-4 text-sky-600" />
                  <span>Appliance Warranty & Serial Asset ID</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Serial Number (from warranty card / label)
                    </label>
                    <Input
                      placeholder="e.g. SN-984214-LLD"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Model Number / Variant
                    </label>
                    <Input
                      placeholder="e.g. 1.5T 5-Star Inverter"
                      value={modelNumber}
                      onChange={(e) => setModelNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 11. CIVIC / MUNICIPAL CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'CIVIC' && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-4">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Municipal Locality & Ward Identifier</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Municipality / Ward Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Ward 104, Serilingampally"
                      value={civicWard}
                      onChange={(e) => setCivicWard(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nearest Landmark / Street
                    </label>
                    <Input
                      placeholder="e.g. Opposite Rythu Bazaar Main Gate"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 12. POWER / ELECTRICITY CUSTOM FIELDS */}
            {activeDomain.customFieldType === 'POWER' && (
              <div className="p-4 rounded-2xl bg-yellow-50/60 border border-yellow-100 space-y-4">
                <div className="flex items-center gap-2 text-yellow-800 text-xs font-bold">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span>Electricity Consumer Identifier</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consumer Connection / USC Number (from bill) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. USC-104928104 / CA 10294810"
                    value={consumerServiceNo}
                    onChange={(e) => setConsumerServiceNo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Location / City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  City / District <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Rajahmundry, Hyderabad, Bangalore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Enforcement Priority Level <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CasePriority)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="LOW">Low Priority (72-Hour Resolution SLA)</option>
                  <option value="MEDIUM">Medium Priority (48-Hour Resolution SLA)</option>
                  <option value="HIGH">High Priority (24-Hour Resolution SLA)</option>
                  <option value="URGENT">Urgent Priority (6-12 Hour Emergency SLA)</option>
                </select>
              </div>
            </div>

            {/* Problem Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Complete Grievance Facts & Statement <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Describe all key details, previous complaint numbers, dates, and what resolution you require..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed placeholder-slate-400"
              />
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching to {selectedProvider.shortCode}...</span>
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Official Case to {selectedProvider.name}</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* RIGHT COLUMN: Live SLA Preview & Authority Dispatch Summary (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-4 sticky top-20">
          
          {/* Dispatch Target Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Enforcement & Routing Preview
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300">
                  Target Entity
                </span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Agency
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-white">{selectedProvider.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{selectedProvider.category}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Official Helpline:</span>
                <strong className="text-white">{selectedProvider.helpline}</strong>
              </div>
            </div>

            {/* SLA Timeline Guarantee */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Guaranteed SLA:</span>
                </span>
                <strong className="text-blue-700 font-bold">
                  {priority === 'URGENT' ? '6-12h' : priority === 'HIGH' ? '24h' : '48h'} Turnaround
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Immediate cryptographic case ID generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Automated dispatch to agency triage queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Auto-escalation to Senior Officer upon SLA breach</span>
                </div>
              </div>
            </div>

            {/* Quick Emergency Note for Ragging / Blood */}
            {(activeDomain.id === 'antiragging' || activeDomain.id === 'cybercrime' || activeDomain.id === 'healthcare') && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>High-Priority Case:</strong> This submission activates immediate rapid response protocol with priority dispatch.
                </span>
              </div>
            )}
          </div>

          {/* Need help banner */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Don't know which category?</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Use our AI Natural Language Intake to speak or type in any language. The AI will classify your provider automatically.
            </p>
            <button
              type="button"
              onClick={() => navigate('/citizen/intake')}
              className="text-blue-700 font-bold underline hover:text-blue-900 block pt-1"
            >
              Open AI Intake Assistant →
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
