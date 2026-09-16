import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Alert,
  Tabs,
} from '../../design-system/index.js';
import {
  HeartHandshake,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Lock,
  Activity,
  Filter,
} from 'lucide-react';

export const CitizenBloodHub: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'request' | 'discover' | 'donor'>(
    (searchParams.get('tab') as any) || 'discover'
  );

  // Discovery state
  const [searchGroup, setSearchGroup] = useState('O-');
  const [searchLocality, setSearchLocality] = useState('Madhapur');
  const [searchRadius, setSearchRadius] = useState('25');
  const [searching, setSearching] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Safe Contact state
  const [selectedDonor, setSelectedDonor] = useState<any | null>(null);
  const [contactHospital, setContactHospital] = useState('Metro Trauma Hospital');
  const [contactUnits, setContactUnits] = useState('2');
  const [contactPhone, setContactPhone] = useState('+91 9876543210');
  const [contactMessage, setContactMessage] = useState('Urgent requirement for emergency surgery');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Request form state
  const [reqBloodGroup, setReqBloodGroup] = useState('O-');
  const [reqUnits, setReqUnits] = useState('2');
  const [reqHospital, setReqHospital] = useState('');
  const [reqPatient, setReqPatient] = useState('');
  const [reqUrgency, setReqUrgency] = useState('CRITICAL_IMMEDIATE');
  const [reqRelationship, setReqRelationship] = useState('FAMILY');
  const [reqPhone, setReqPhone] = useState('');
  const [reqLocality, setReqLocality] = useState('Madhapur');
  const [reqCity, setReqCity] = useState('Hyderabad');
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseCreatedRef, setCaseCreatedRef] = useState<string | null>(null);

  // Donor Registration state
  const [myDonorProfile, setMyDonorProfile] = useState<any | null>(null);
  const [donorBloodGroup, setDonorBloodGroup] = useState('O+');
  const [donorLocality, setDonorLocality] = useState('Madhapur');
  const [donorMunicipality, setDonorMunicipality] = useState('Greater Hyderabad');
  const [donorDistrict, setDonorDistrict] = useState('Hyderabad');
  const [donorPreference, setDonorPreference] = useState('IN_APP');
  const [donorPhone, setDonorPhone] = useState('+91 9876543210');
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    handleSearch();
    loadMyDonorProfile();
  }, [token]);

  const loadMyDonorProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/blood/donors/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setMyDonorProfile(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch donor profile', err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({
        bloodGroup: searchGroup,
        locality: searchLocality,
        radiusKm: searchRadius,
      });
      const res = await fetch(`/api/v1/blood/search?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setDiscoveryResult(json.data);
      } else {
        const err = await res.json();
        setSearchError(err.error?.message || 'Failed to search blood availability');
      }
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRelayAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) return;
    setSendingAlert(true);
    setAlertSuccess(null);
    try {
      const res = await fetch('/api/v1/blood/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          anonymousDonorCode: selectedDonor.anonymousDonorCode,
          hospitalName: contactHospital,
          unitsNeeded: parseInt(contactUnits, 10),
          urgency: 'CRITICAL_IMMEDIATE',
          attendantPhone: contactPhone,
          message: contactMessage,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setAlertSuccess(json.data.message);
      } else {
        alert(json.error?.message || 'Failed to send relay alert');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingAlert(false);
    }
  };

  const handleCreateBloodCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCase(true);
    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'BLOOD_REQUEST',
          title: `Emergency ${reqUnits} Unit(s) ${reqBloodGroup} Required at ${reqHospital}`,
          description: `Urgent requirement for ${reqBloodGroup} whole blood for emergency hospital care.`,
          category: 'Emergency Healthcare',
          priority: reqUrgency === 'CRITICAL_IMMEDIATE' ? 'URGENT' : 'HIGH',
          productService: 'Emergency Blood Bank',
          structuredData: {
            bloodGroup: reqBloodGroup,
            unitsNeeded: parseInt(reqUnits, 10),
            hospitalName: reqHospital,
            patientName: reqPatient,
            urgency: reqUrgency,
            requesterRelationship: reqRelationship,
            contactPhone: reqPhone,
          },
          location: {
            city: reqCity,
            locality: reqLocality,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setCaseCreatedRef(json.data.referenceNumber);
      } else {
        alert(json.error?.message || 'Failed to create blood case');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegSuccess(null);
    try {
      const res = await fetch('/api/v1/blood/donors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bloodGroup: donorBloodGroup,
          approximateLocation: {
            locality: donorLocality,
            municipality: donorMunicipality,
            district: donorDistrict,
            state: 'Telangana',
          },
          contactPreference: donorPreference,
          contactPhone: donorPhone,
          availabilityStatus: 'AVAILABLE',
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setRegSuccess(json.data.anonymousDonorCode);
        loadMyDonorProfile();
      } else {
        alert(json.error?.message || 'Failed to register as donor');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleStatus = async (newStatus: string) => {
    try {
      const res = await fetch('/api/v1/blood/donors/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadMyDonorProfile();
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-rose-700/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-rose-300 animate-pulse" />
                Emergency Healthcare Protocol
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Privacy Safeguarded
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <HeartHandshake className="w-7 h-7 text-rose-400" />
              Emergency Blood & Voluntary Donor Network
            </h1>
            <p className="text-sm text-rose-100/80 mt-1 max-w-2xl leading-relaxed">
              Progressive 5-level geographic hierarchy discovery with MongoDB 2dsphere indexing. Safe emergency relay ensures donors are contacted without public exposure of personal contact details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('request')}
              className="bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/50 text-white text-xs"
            >
              Raise Urgent Request
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('donor')}
              className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs"
            >
              {myDonorProfile ? 'My Donor Profile' : 'Register as Donor'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          { id: 'discover', label: 'Discover Donors' },
          { id: 'request', label: 'Raise Request' },
          { id: 'donor', label: 'Donor Registry' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        className="max-w-md mx-auto"
      />

      {/* TAB 1: DISCOVER AVAILABILITY HIERARCHY */}
      {activeTab === 'discover' && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-rose-600" />
                  Progressive 5-Level Blood Availability Search
                </span>
                <span className="text-xs font-normal text-slate-500">
                  Geospatial & Administrative Proximity
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Matches availability progressively from your immediate locality to town, mandal, district, and statewide network.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={searchGroup}
                    onChange={(e) => setSearchGroup(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2 font-semibold text-rose-700 bg-white"
                  >
                    {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Locality / City</label>
                  <Input
                    value={searchLocality}
                    onChange={(e) => setSearchLocality(e.target.value)}
                    placeholder="e.g. Madhapur / Hyderabad"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Radius</label>
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="5">Within 5 km (Immediate Locality)</option>
                    <option value="15">Within 15 km (Town / Municipality)</option>
                    <option value="35">Within 35 km (Mandal / Sub-District)</option>
                    <option value="75">Within 75 km (District Wide)</option>
                    <option value="200">Statewide Network (200 km)</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={searching}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                >
                  {searching ? 'Querying...' : 'Search Availability'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Display */}
          {searchError && (
            <Alert variant="error">
              <AlertCircle className="w-4 h-4" />
              <span>{searchError}</span>
            </Alert>
          )}

          {discoveryResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">
                  Total Matching Donors for <span className="text-rose-600 font-bold">{discoveryResult.bloodGroup}</span>: {discoveryResult.totalAvailable}
                </div>
                <div className="text-xs text-slate-500">
                  Privacy Safeguarded • Exact addresses masked
                </div>
              </div>

              {/* 5-Level Hierarchy Sections */}
              <div className="space-y-5">
                {discoveryResult.hierarchy.map((group: any) => (
                  <div
                    key={group.level}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
                  >
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          group.level === 1 ? 'bg-emerald-600' :
                          group.level === 2 ? 'bg-blue-600' :
                          group.level === 3 ? 'bg-amber-600' :
                          group.level === 4 ? 'bg-purple-600' : 'bg-slate-600'
                        }`}>
                          L{group.level}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{group.label}</h3>
                          <p className="text-[11px] text-slate-500">{group.description}</p>
                        </div>
                      </div>
                      <Badge variant={group.count > 0 ? 'resolved' : 'neutral'} size="sm">
                        {group.count} Available
                      </Badge>
                    </div>

                    <div className="p-4">
                      {group.donors.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">
                          No donors currently registered in this tier for {discoveryResult.bloodGroup}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.donors.map((donor: any) => (
                            <div
                              key={donor.anonymousDonorCode}
                              className="border border-slate-200 rounded-lg p-3 hover:border-rose-400 transition-colors bg-white flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    {donor.anonymousDonorCode}
                                  </span>
                                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    {donor.bloodGroup}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>
                                      {donor.approximateLocation.locality || donor.approximateLocation.municipality || 'Hyderabad'},{' '}
                                      {donor.approximateLocation.district || 'Telangana'}
                                    </span>
                                  </div>
                                  {donor.distanceKm !== undefined && (
                                    <div className="text-[11px] text-emerald-700 font-medium">
                                      Approx. {donor.distanceKm} km away
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                  Safe Relay
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDonor(donor)}
                                  className="text-xs py-1 h-7 text-rose-600 border-rose-300 hover:bg-rose-50"
                                >
                                  Safe Contact
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safe Contact Modal / Slide */}
          {selectedDonor && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-rose-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Safe Alert to {selectedDonor.anonymousDonorCode}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDonor(null);
                      setAlertSuccess(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {alertSuccess ? (
                  <div className="py-6 space-y-4 text-center">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Emergency Alert Dispatched!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      {alertSuccess}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedDonor(null);
                        setAlertSuccess(null);
                      }}
                      className="mt-2"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendRelayAlert} className="space-y-4 pt-4">
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                      <strong>Privacy Notice:</strong> The donor's phone number is kept confidential. CPET dispatches an automated emergency push notification and relay message to this donor on your behalf.
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Hospital / Medical Center</label>
                      <Input
                        value={contactHospital}
                        onChange={(e) => setContactHospital(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Units Needed</label>
                        <Input
                          type="number"
                          value={contactUnits}
                          onChange={(e) => setContactUnits(e.target.value)}
                          required
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Attendant Phone</label>
                        <Input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          required
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Emergency Message</label>
                      <Input
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDonor(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={sendingAlert}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        {sendingAlert ? 'Transmitting Alert...' : 'Send Safe Emergency Alert'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RAISE URGENT BLOOD REQUEST CASE */}
      {activeTab === 'request' && (
        <div className="mt-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
                Submit Official Blood Requirement Case
              </CardTitle>
              <CardDescription className="text-xs">
                Creates a high-priority case routed directly to certified blood bank coordinators with a 6-hour emergency SLA.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {caseCreatedRef ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Blood Requirement Case Registered: {caseCreatedRef}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your request has been routed to Red Cross Blood Center & Trauma Care. You can track real-time responses, updates, and messages on the case timeline.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/citizen/requests')}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Track My Requests
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCaseCreatedRef(null);
                        setActiveTab('discover');
                      }}
                    >
                      Search Available Donors
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateBloodCase} className="space-y-4 max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Blood Group Required *</label>
                      <select
                        value={reqBloodGroup}
                        onChange={(e) => setReqBloodGroup(e.target.value)}
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 font-bold text-rose-700 bg-white"
                        required
                      >
                        {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Units Needed *</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={reqUnits}
                        onChange={(e) => setReqUnits(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Hospital / Medical Center *</label>
                      <Input
                        value={reqHospital}
                        onChange={(e) => setReqHospital(e.target.value)}
                        placeholder="e.g. City Trauma Hospital, Ward 2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Patient Name</label>
                      <Input
                        value={reqPatient}
                        onChange={(e) => setReqPatient(e.target.value)}
                        placeholder="e.g. R. Sharma"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Urgency Level *</label>
                      <select
                        value={reqUrgency}
                        onChange={(e) => setReqUrgency(e.target.value)}
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                      >
                        <option value="CRITICAL_IMMEDIATE">CRITICAL_IMMEDIATE (Surgery / ICU)</option>
                        <option value="WITHIN_24_HOURS">WITHIN_24_HOURS (Scheduled)</option>
                        <option value="SCHEDULED_DATE">SCHEDULED_DATE (Elective)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Relationship to Patient *</label>
                      <select
                        value={reqRelationship}
                        onChange={(e) => setReqRelationship(e.target.value)}
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                      >
                        <option value="FAMILY">Family Member / Relative</option>
                        <option value="SELF">Self</option>
                        <option value="ATTENDANT">Attendant</option>
                        <option value="HOSPITAL_STAFF">Hospital Staff / Doctor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Locality *</label>
                      <Input
                        value={reqLocality}
                        onChange={(e) => setReqLocality(e.target.value)}
                        placeholder="e.g. Madhapur"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">City *</label>
                      <Input
                        value={reqCity}
                        onChange={(e) => setReqCity(e.target.value)}
                        placeholder="e.g. Hyderabad"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Attendant Phone *</label>
                      <Input
                        value={reqPhone}
                        onChange={(e) => setReqPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={submittingCase}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5"
                    >
                      {submittingCase ? 'Registering Emergency Case...' : 'Submit Emergency Blood Request'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: DONOR REGISTRATION & PRIVACY PROFILE */}
      {activeTab === 'donor' && (
        <div className="mt-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-rose-600" />
                  Voluntary Blood Donor Registry & Privacy
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Privacy Protected
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Register as a voluntary blood donor. Your personal phone number, real name, and exact address are never exposed publicly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {myDonorProfile ? (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Your Safe Donor ID</span>
                        <span className="font-mono text-base font-bold text-slate-900">
                          {myDonorProfile.anonymousDonorCode}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-rose-600 bg-rose-100/60 px-3 py-1 rounded-lg border border-rose-200">
                        {myDonorProfile.bloodGroup}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Approximate Locality:</span>
                        <span className="font-medium text-slate-800">
                          {myDonorProfile.approximateLocation?.locality || 'Hyderabad'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">District:</span>
                        <span className="font-medium text-slate-800">
                          {myDonorProfile.approximateLocation?.district || 'Telangana'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Contact Preference:</span>
                        <span className="font-medium text-slate-800">{myDonorProfile.contactPreference}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Current Status:</span>
                        <Badge
                          variant={myDonorProfile.availabilityStatus === 'AVAILABLE' ? 'resolved' : 'escalated'}
                          size="sm"
                        >
                          {myDonorProfile.availabilityStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">Toggle Availability:</span>
                      <div className="flex gap-2">
                        <Button
                          variant={myDonorProfile.availabilityStatus === 'AVAILABLE' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleStatus('AVAILABLE')}
                          className="text-xs"
                        >
                          Available
                        </Button>
                        <Button
                          variant={myDonorProfile.availabilityStatus === 'UNAVAILABLE' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleStatus('UNAVAILABLE')}
                          className="text-xs"
                        >
                          Unavailable
                        </Button>
                        <Button
                          variant={myDonorProfile.availabilityStatus === 'COOLDOWN' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleStatus('COOLDOWN')}
                          className="text-xs"
                        >
                          Cooldown
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterDonor} className="space-y-4 max-w-xl mx-auto">
                  {regSuccess && (
                    <Alert variant="success">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Registered successfully with safe code: {regSuccess}</span>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Your Blood Group *</label>
                      <select
                        value={donorBloodGroup}
                        onChange={(e) => setDonorBloodGroup(e.target.value)}
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 font-bold text-rose-700 bg-white"
                        required
                      >
                        {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone (Private) *</label>
                      <Input
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Approximate Locality *</label>
                      <Input
                        value={donorLocality}
                        onChange={(e) => setDonorLocality(e.target.value)}
                        placeholder="e.g. Madhapur"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Municipality / Town *</label>
                      <Input
                        value={donorMunicipality}
                        onChange={(e) => setDonorMunicipality(e.target.value)}
                        placeholder="e.g. Greater Hyderabad"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">District *</label>
                      <Input
                        value={donorDistrict}
                        onChange={(e) => setDonorDistrict(e.target.value)}
                        placeholder="e.g. Hyderabad"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Safe Contact Preference</label>
                    <select
                      value={donorPreference}
                      onChange={(e) => setDonorPreference(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                    >
                      <option value="IN_APP">In-App Emergency Notification (Recommended)</option>
                      <option value="RELAY_SMS">Relay SMS</option>
                      <option value="ANONYMOUS_PROXY">Anonymous Proxy Call</option>
                    </select>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={registering}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5"
                    >
                      {registering ? 'Registering Safe Profile...' : 'Register as Voluntary Donor'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
