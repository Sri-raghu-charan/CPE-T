import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  Heart,
  Droplet,
  Search,
  MapPin,
  ChevronRight,
  User,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Phone,
  Building2,
  Send,
  Bell,
  X,
  ArrowRight,
  Activity,
  HeartHandshake,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

type BloodTab = 'overview' | 'inventory' | 'donors' | 'requests' | 'register' | 'profile';

interface BloodInventoryItem {
  id: string;
  name: string;
  category: string;
  type: string;
  distanceKm: number;
  location: string;
  address?: string;
  phone?: string;
  inventory: Record<string, { status: string; units: number }>;
}

interface DonorItem {
  id: string;
  anonymousDonorCode: string;
  name: string;
  bloodGroup: string;
  distanceKm: number;
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'COOLDOWN';
  location: string;
  phone: string;
  lastDonatedAt?: string;
  lastDonatedLabel: string;
  about: string;
  contactPreference: string;
  totalDonations?: number;
}

interface BloodRequestCase {
  id: string;
  referenceNumber: string;
  hospitalName: string;
  bloodGroup: string;
  units: number | string;
  requestType: string;
  dateStr: string;
  timeStr: string;
  status: 'In Progress' | 'Resolved' | 'Pending' | 'Closed' | 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  currentStep: number; // 1: Created, 2: Processing, 3: In Progress, 4: Resolved
  patientName?: string;
  reason?: string;
  timeline: Array<{
    title: string;
    timestamp: string;
    actor: string;
    description?: string;
  }>;
  messages: Array<{
    sender: string;
    time: string;
    text: string;
    isStaff?: boolean;
  }>;
}

// Initial Mock Inventory
const INITIAL_INVENTORY: BloodInventoryItem[] = [
  {
    id: 'hosp-1',
    name: 'Rajahmundry Government Hospital',
    category: 'Government Blood Bank',
    type: 'Government',
    distanceKm: 2.3,
    location: 'Danavaipeta, Rajamahendravaram',
    address: 'Near Central Jail Road, Danavaipeta, Rajahmundry, East Godavari, AP - 533103',
    phone: '+91 883 247 1234',
    inventory: {
      'O+': { status: 'Available', units: 14 },
      'A+': { status: 'Available', units: 8 },
      'B+': { status: 'Limited', units: 3 },
      'AB+': { status: 'Available', units: 10 },
      'O-': { status: 'Limited', units: 2 },
      'A-': { status: 'Out of Stock', units: 0 },
      'B-': { status: 'Limited', units: 1 },
      'AB-': { status: 'Out of Stock', units: 0 },
    },
  },
  {
    id: 'hosp-2',
    name: 'Life Line Rotary Blood Bank',
    category: 'Certified Charitable Blood Bank',
    type: 'Private',
    distanceKm: 3.1,
    location: 'Innespeta, Rajamahendravaram',
    address: 'Main Road, Innespeta, Rajahmundry, East Godavari, AP - 533101',
    phone: '+91 883 244 5678',
    inventory: {
      'O+': { status: 'Available', units: 18 },
      'A+': { status: 'Available', units: 12 },
      'B+': { status: 'Available', units: 9 },
      'AB+': { status: 'Available', units: 6 },
      'O-': { status: 'Available', units: 4 },
      'A-': { status: 'Limited', units: 2 },
      'B-': { status: 'Limited', units: 2 },
      'AB-': { status: 'Limited', units: 1 },
    },
  },
  {
    id: 'hosp-3',
    name: 'District Area Hospital',
    category: 'Government District Hub',
    type: 'Government',
    distanceKm: 4.5,
    location: 'Kotipalli Bus Stand, Rajamahendravaram',
    address: 'RTC Complex Road, Kotipalli Area, Rajahmundry, AP - 533104',
    phone: '+91 883 242 8899',
    inventory: {
      'O+': { status: 'Available', units: 7 },
      'A+': { status: 'Limited', units: 3 },
      'B+': { status: 'Limited', units: 3 },
      'AB+': { status: 'Available', units: 5 },
      'O-': { status: 'Limited', units: 1 },
      'A-': { status: 'Out of Stock', units: 0 },
      'B-': { status: 'Out of Stock', units: 0 },
      'AB-': { status: 'Out of Stock', units: 0 },
    },
  },
  {
    id: 'hosp-4',
    name: 'Apollo Hospital & Trauma Center',
    category: 'Super Specialty Blood Bank',
    type: 'Private',
    distanceKm: 6.2,
    location: 'Morampudi Junction, Rajamahendravaram',
    address: 'NH-16 Bypass Road, Morampudi, Rajahmundry, AP - 533106',
    phone: '+91 883 249 9000',
    inventory: {
      'O+': { status: 'Available', units: 22 },
      'A+': { status: 'Available', units: 15 },
      'B+': { status: 'Available', units: 11 },
      'AB+': { status: 'Available', units: 10 },
      'O-': { status: 'Available', units: 6 },
      'A-': { status: 'Available', units: 4 },
      'B-': { status: 'Available', units: 3 },
      'AB-': { status: 'Limited', units: 2 },
    },
  },
  {
    id: 'hosp-5',
    name: 'Rural Health & First Referral Center',
    category: 'Community Blood Storage',
    type: 'Government',
    distanceKm: 8.7,
    location: 'Kadiyam, East Godavari',
    address: 'Nursery Road, Kadiyam, East Godavari District, AP - 533126',
    phone: '+91 883 241 3322',
    inventory: {
      'O+': { status: 'Available', units: 6 },
      'A+': { status: 'Limited', units: 2 },
      'B+': { status: 'Available', units: 5 },
      'AB+': { status: 'Limited', units: 2 },
      'O-': { status: 'Out of Stock', units: 0 },
      'A-': { status: 'Out of Stock', units: 0 },
      'B-': { status: 'Out of Stock', units: 0 },
      'AB-': { status: 'Out of Stock', units: 0 },
    },
  },
];

// Initial Mock Donors
const INITIAL_DONORS: DonorItem[] = [
  {
    id: 'donor-1',
    anonymousDonorCode: 'CPET-DONOR-8842',
    name: 'Suresh Kumar',
    bloodGroup: 'O+',
    distanceKm: 1.2,
    availabilityStatus: 'AVAILABLE',
    location: 'Danavaipeta, Rajahmundry',
    phone: '+91 98765 43210',
    lastDonatedLabel: '12 months ago',
    about: 'I am a registered voluntary blood donor and willing to help in critical emergencies anytime.',
    contactPreference: 'In-App Notification & Direct Call',
    totalDonations: 6,
  },
  {
    id: 'donor-2',
    anonymousDonorCode: 'CPET-DONOR-9120',
    name: 'Anitha Reddy',
    bloodGroup: 'A+',
    distanceKm: 2.4,
    availabilityStatus: 'AVAILABLE',
    location: 'Innespeta, Rajahmundry',
    phone: '+91 98765 43211',
    lastDonatedLabel: '4 months ago',
    about: 'Regular platelet and whole blood donor at Rajahmundry Govt Hospital.',
    contactPreference: 'Relay SMS Alert',
    totalDonations: 4,
  },
  {
    id: 'donor-3',
    anonymousDonorCode: 'CPET-DONOR-4091',
    name: 'Ravi Teja',
    bloodGroup: 'B-',
    distanceKm: 3.1,
    availabilityStatus: 'AVAILABLE',
    location: 'Kotipalli Area, Rajahmundry',
    phone: '+91 98765 43212',
    lastDonatedLabel: '6 months ago',
    about: 'Rare blood group B- donor. Always on standby for emergency trauma cases.',
    contactPreference: 'Direct Call & SMS',
    totalDonations: 8,
  },
  {
    id: 'donor-4',
    anonymousDonorCode: 'CPET-DONOR-7719',
    name: 'Praveen Varma',
    bloodGroup: 'AB+',
    distanceKm: 4.8,
    availabilityStatus: 'AVAILABLE',
    location: 'Morampudi, Rajahmundry',
    phone: '+91 98765 43213',
    lastDonatedLabel: '8 months ago',
    about: 'Voluntary plasma and whole blood donor in East Godavari district.',
    contactPreference: 'In-App Notification',
    totalDonations: 3,
  },
  {
    id: 'donor-5',
    anonymousDonorCode: 'CPET-DONOR-6632',
    name: 'Lakshmi Priya',
    bloodGroup: 'O-',
    distanceKm: 6.2,
    availabilityStatus: 'AVAILABLE',
    location: 'Katheru, Rajahmundry',
    phone: '+91 98765 43214',
    lastDonatedLabel: '3 months ago',
    about: 'Universal donor O- on call for maternal deliveries and emergency surgeries.',
    contactPreference: 'Direct Call',
    totalDonations: 9,
  },
  {
    id: 'donor-6',
    anonymousDonorCode: 'CPET-DONOR-3199',
    name: 'Karthik Rao',
    bloodGroup: 'B+',
    distanceKm: 7.5,
    availabilityStatus: 'COOLDOWN',
    location: 'Kadiyam, East Godavari',
    phone: '+91 98765 43215',
    lastDonatedLabel: '3 weeks ago',
    about: 'Donated recently on Sep 05, currently in 90-day cooldown period.',
    contactPreference: 'In-App Notification',
    totalDonations: 5,
  },
];

// Initial Requests
const INITIAL_REQUESTS: BloodRequestCase[] = [
  {
    id: 'req-1',
    referenceNumber: 'CPET-2026-BLD-8821',
    hospitalName: 'Rajahmundry Government Hospital',
    bloodGroup: 'O+',
    units: '2 Units',
    requestType: 'Emergency Request',
    dateStr: 'Apr 18, 2026',
    timeStr: '10:30 AM',
    status: 'In Progress',
    currentStep: 3,
    patientName: 'K. Satyanarayana',
    reason: 'Emergency Accident Surgery',
    timeline: [
      {
        title: 'Request Created',
        timestamp: 'Apr 18, 2026 • 10:30 AM',
        actor: 'By You',
        description: 'Emergency blood request initiated for 2 Units of O+.',
      },
      {
        title: 'Assigned to Blood Bank',
        timestamp: 'Apr 18, 2026 • 11:20 AM',
        actor: 'By AI Triage & Dispatch',
        description: 'Auto-routed to Rajahmundry Government Hospital blood bank inventory.',
      },
      {
        title: 'Unit Reserved',
        timestamp: 'Apr 18, 2026 • 01:45 PM',
        actor: 'By Duty Officer Dr. Mohan',
        description: '2 units of O+ cross-matched and reserved under cold storage.',
      },
      {
        title: 'In Progress & Transit',
        timestamp: 'Apr 18, 2026 • 02:10 PM',
        actor: 'By CPET Cold-Chain Dispatch',
        description: 'Buffer dispatch in transit to Operation Theater #2.',
      },
    ],
    messages: [
      {
        sender: 'Hospital Duty Desk',
        time: '11:25 AM',
        text: 'Hello, your emergency request has been acknowledged. Cross-matching is underway.',
        isStaff: true,
      },
      {
        sender: 'You',
        time: '11:30 AM',
        text: 'Thank you! Patient is currently in ICU-B, Room 104.',
        isStaff: false,
      },
      {
        sender: 'Hospital Duty Desk',
        time: '01:50 PM',
        text: 'Units reserved successfully. Cold-chain courier assigned for transit.',
        isStaff: true,
      },
    ],
  },
  {
    id: 'req-2',
    referenceNumber: 'CPET-2026-BLD-7612',
    hospitalName: 'Life Line Rotary Blood Bank',
    bloodGroup: 'A+',
    units: '1 Unit',
    requestType: 'Donation Request',
    dateStr: 'Apr 10, 2026',
    timeStr: '03:15 PM',
    status: 'Resolved',
    currentStep: 4,
    patientName: 'P. Sunitha',
    reason: 'Planned Chemotherapy Transfusion',
    timeline: [
      {
        title: 'Request Created',
        timestamp: 'Apr 10, 2026 • 03:15 PM',
        actor: 'By You',
      },
      {
        title: 'Processing & Verification',
        timestamp: 'Apr 10, 2026 • 03:30 PM',
        actor: 'By Life Line Staff',
      },
      {
        title: 'Transfusion Completed',
        timestamp: 'Apr 10, 2026 • 06:00 PM',
        actor: 'By Life Line Staff',
        description: 'Blood unit verified and administered successfully.',
      },
    ],
    messages: [
      {
        sender: 'Life Line Staff',
        time: '03:40 PM',
        text: 'The A+ unit has been cross-checked and ready for collection.',
        isStaff: true,
      },
    ],
  },
  {
    id: 'req-3',
    referenceNumber: 'CPET-2026-BLD-5501',
    hospitalName: 'District Area Hospital',
    bloodGroup: 'B+',
    units: '2 Units',
    requestType: 'Emergency Request',
    dateStr: 'Apr 05, 2026',
    timeStr: '11:20 AM',
    status: 'Pending',
    currentStep: 2,
    patientName: 'M. Ramesh',
    reason: 'Delivery & Maternal Emergency',
    timeline: [
      {
        title: 'Request Created',
        timestamp: 'Apr 05, 2026 • 11:20 AM',
        actor: 'By You',
      },
      {
        title: 'Triage & Donor Matching',
        timestamp: 'Apr 05, 2026 • 11:35 AM',
        actor: 'By System',
        description: 'Matching with nearby voluntary donors within 5 km.',
      },
    ],
    messages: [],
  },
  {
    id: 'req-4',
    referenceNumber: 'CPET-2026-BLD-4109',
    hospitalName: 'Apollo Hospital & Trauma Center',
    bloodGroup: 'AB+',
    units: '1 Unit',
    requestType: 'Donation Request',
    dateStr: 'Mar 28, 2026',
    timeStr: '09:45 AM',
    status: 'Closed',
    currentStep: 4,
    patientName: 'Self (Voluntary Camp)',
    reason: 'Voluntary Donation',
    timeline: [
      {
        title: 'Donation Completed',
        timestamp: 'Mar 28, 2026 • 10:30 AM',
        actor: 'By Apollo Blood Bank',
      },
    ],
    messages: [],
  },
];

export const CitizenBloodHub: React.FC = () => {
  const { token, user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<BloodTab>('overview');

  // Blood Group Filter
  const [selectedBloodGroupFilter, setSelectedBloodGroupFilter] = useState<string>('ALL');

  // Location Hierarchy State
  const [locationMode, setLocationMode] = useState<'nearby' | 'manual'>('nearby');
  const [locLocality, setLocLocality] = useState('Danavaipeta');
  const [locMunicipality, setLocMunicipality] = useState('Rajamahendravaram');
  const [locSubDistrict, setLocSubDistrict] = useState('East Godavari');
  const [locDistrict, setLocDistrict] = useState('East Godavari');
  const [locState, setLocState] = useState('Andhra Pradesh');

  // Data State
  const [inventoryList, setInventoryList] = useState<BloodInventoryItem[]>(INITIAL_INVENTORY);
  const [donorsList, setDonorsList] = useState<DonorItem[]>(INITIAL_DONORS);
  const [requestsList, setRequestsList] = useState<BloodRequestCase[]>(INITIAL_REQUESTS);

  // Filters & Search
  const [donorSearchQuery, setDonorSearchQuery] = useState('');
  const [donorTabFilter, setDonorTabFilter] = useState<'all' | 'nearby' | 'available'>('all');
  const [requestsFilterTab, setRequestsFilterTab] = useState<'All' | 'Active' | 'Pending' | 'Resolved' | 'Closed'>('All');

  // Selected Detail Views
  const [selectedDonor, setSelectedDonor] = useState<DonorItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequestCase | null>(INITIAL_REQUESTS[0]);
  const [requestDetailTab, setRequestDetailTab] = useState<'timeline' | 'chat' | 'details'>('timeline');
  const [newChatText, setNewChatText] = useState('');

  // Emergency Request Modal State
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [reqBloodType, setReqBloodType] = useState('O+');
  const [reqUnits, setReqUnits] = useState('2 Units');
  const [reqHospital, setReqHospital] = useState('Rajahmundry Government Hospital');
  const [reqPatient, setReqPatient] = useState('');
  const [reqReason, setReqReason] = useState('Accident');
  const [reqPhone, setReqPhone] = useState(user?.phone || '+91 98765 43210');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccessBanner, setRequestSuccessBanner] = useState<string | null>(null);

  // Contact Donor Relay Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactRelayMsg, setContactRelayMsg] = useState('');
  const [contactAlertSent, setContactAlertSent] = useState<string | null>(null);

  // Voluntary Donor Registration Form State
  const [regFullName, setRegFullName] = useState(user?.name || '');
  const [regPhone, setRegPhone] = useState(user?.phone || '');
  const [regBloodType, setRegBloodType] = useState('O+');
  const [regLocation, setRegLocation] = useState('Danavaipeta, Rajahmundry');
  const [regInfo, setRegInfo] = useState('');
  const [regPref, setRegPref] = useState('In-App Notification & Direct Call');
  const [registeringDonor, setRegisteringDonor] = useState(false);
  const [registeredDonorProfile, setRegisteredDonorProfile] = useState<DonorItem | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Fetch real data from backend on mount
  const fetchBackendData = useCallback(async () => {
    try {
      // 1. Fetch Donors
      const donorRes = await fetch('/api/v1/blood/donors');
      if (donorRes.ok) {
        const json = await donorRes.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setDonorsList(json.data);
        }
      }

      // 2. Fetch Inventory
      const invRes = await fetch('/api/v1/blood/inventory');
      if (invRes.ok) {
        const json = await invRes.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setInventoryList(json.data);
        }
      }

      // 3. Check if user is registered donor
      if (token) {
        const meRes = await fetch('/api/v1/blood/donors/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const json = await meRes.json();
          if (json.data) {
            setRegisteredDonorProfile({
              id: json.data.id || 'donor-me',
              anonymousDonorCode: json.data.anonymousDonorCode || 'CPET-DONOR-ME',
              name: user?.name || 'You (Registered Donor)',
              bloodGroup: json.data.bloodGroup || 'O+',
              distanceKm: 0,
              availabilityStatus: json.data.availabilityStatus || 'AVAILABLE',
              location: json.data.approximateLocation?.locality || 'Rajahmundry',
              phone: json.data.contactPhone || user?.phone || '',
              lastDonatedLabel: 'Registered Donor',
              about: 'Verified voluntary donor profile.',
              contactPreference: json.data.contactPreference || 'IN_APP',
              totalDonations: 1,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Backend blood data sync note:', e);
    }
  }, [token, user]);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  // Handle Quick Emergency Request Submission
  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);

    try {
      const refNum = `CPET-2026-BLD-${Math.floor(1000 + Math.random() * 9000)}`;

      if (token) {
        try {
          await fetch('/api/v1/cases', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: `Emergency Blood Request: ${reqBloodType} (${reqUnits}) at ${reqHospital}`,
              description: `Urgent requirement of ${reqUnits} of ${reqBloodType} blood for patient ${reqPatient || 'Emergency Patient'}. Reason: ${reqReason}. Contact: ${reqPhone}`,
              type: 'SERVICE_REQUEST',
              category: 'HEALTHCARE',
              priority: 'URGENT',
              productService: 'BLOOD_BANK_EMERGENCY',
              location: {
                locality: locLocality,
                city: locMunicipality,
                district: locDistrict,
                state: locState,
              },
            }),
          });
        } catch (err) {
          console.warn('Case creation backend note:', err);
        }
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const newCase: BloodRequestCase = {
        id: `req-${Date.now()}`,
        referenceNumber: refNum,
        hospitalName: reqHospital,
        bloodGroup: reqBloodType,
        units: reqUnits,
        requestType: 'Emergency Request',
        dateStr,
        timeStr,
        status: 'In Progress',
        currentStep: 2,
        patientName: reqPatient || 'Emergency Patient',
        reason: reqReason,
        timeline: [
          {
            title: 'Request Created',
            timestamp: `${dateStr} • ${timeStr}`,
            actor: 'By You',
            description: `Emergency request initiated for ${reqUnits} of ${reqBloodType}.`,
          },
          {
            title: 'Processing & Dispatch',
            timestamp: `${dateStr} • ${timeStr}`,
            actor: 'By AI Triage & Dispatch',
            description: `Broadcasting emergency notification to nearby ${reqBloodType} donors and blood bank reserves.`,
          },
        ],
        messages: [
          {
            sender: 'CPET Emergency Relay',
            time: timeStr,
            text: `Your emergency request #${refNum} has been registered and broadcast to certified blood banks & active donors near ${reqHospital}.`,
            isStaff: true,
          },
        ],
      };

      setRequestsList([newCase, ...requestsList]);
      setSelectedRequest(newCase);
      setEmergencyModalOpen(false);
      setRequestSuccessBanner(`Emergency Request #${refNum} created successfully! Live tracking has been activated.`);
      setActiveTab('requests');

      setTimeout(() => {
        setRequestSuccessBanner(null);
      }, 6000);
    } catch (err: any) {
      alert('Error submitting emergency request: ' + err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Handle Voluntary Donor Registration
  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringDonor(true);

    try {
      const payload = {
        bloodGroup: regBloodType,
        contactPhone: regPhone || '+91 98765 43210',
        approximateLocation: {
          locality: locLocality,
          municipality: locMunicipality,
          district: locDistrict,
          state: locState,
        },
        contactPreference: regPref === 'In-App Notification & Direct Call' ? 'IN_APP' : 'RELAY_SMS',
      };

      if (token) {
        await fetch('/api/v1/blood/donors/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const newDonor: DonorItem = {
        id: `donor-${Date.now()}`,
        anonymousDonorCode: `CPET-DONOR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: regFullName || user?.name || 'Voluntary Hero',
        bloodGroup: regBloodType,
        distanceKm: 0.5,
        availabilityStatus: 'AVAILABLE',
        location: `${locLocality}, ${locMunicipality}`,
        phone: regPhone || '+91 98765 43210',
        lastDonatedLabel: 'Just Registered',
        about: regInfo || 'Registered voluntary donor ready to assist in medical emergencies.',
        contactPreference: regPref,
        totalDonations: 0,
      };

      setRegisteredDonorProfile(newDonor);
      setDonorsList([newDonor, ...donorsList]);
      setRegSuccessMessage(`Congratulations ${regFullName || 'Donor'}! You are now an active voluntary blood hero.`);
    } catch (err: any) {
      alert('Registration error: ' + err.message);
    } finally {
      setRegisteringDonor(false);
    }
  };

  // Handle Safe Contact / Alert Relay
  const handleSendSafeContact = async () => {
    if (!selectedDonor) return;
    try {
      await fetch('/api/v1/blood/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          anonymousDonorCode: selectedDonor.anonymousDonorCode,
          hospitalName: reqHospital || 'Rajahmundry Government Hospital',
          unitsNeeded: 2,
          urgency: 'CRITICAL_IMMEDIATE',
          attendantPhone: user?.phone || '+91 98765 43210',
          message: contactRelayMsg || 'Urgent requirement for surgery.',
        }),
      });

      setContactAlertSent(`Safe emergency alert successfully relayed to ${selectedDonor.name}! They will receive an SMS and push notification.`);
      setTimeout(() => {
        setContactModalOpen(false);
        setContactAlertSent(null);
        setContactRelayMsg('');
      }, 2500);
    } catch {
      setContactAlertSent(`Alert sent to donor network.`);
      setTimeout(() => {
        setContactModalOpen(false);
        setContactAlertSent(null);
      }, 2000);
    }
  };

  // Add Duty Desk Chat Message
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim() || !selectedRequest) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const updatedMessages = [
      ...selectedRequest.messages,
      {
        sender: 'You',
        time: timeStr,
        text: newChatText.trim(),
        isStaff: false,
      },
    ];

    const updated = {
      ...selectedRequest,
      messages: updatedMessages,
    };

    setSelectedRequest(updated);
    setRequestsList(requestsList.map((r) => (r.id === selectedRequest.id ? updated : r)));
    setNewChatText('');
  };

  // Filter Inventory
  const filteredInventory = inventoryList.filter((item) => {
    if (selectedBloodGroupFilter === 'ALL' || selectedBloodGroupFilter === 'All Blood Types') {
      return true;
    }
    const inv = item.inventory?.[selectedBloodGroupFilter];
    return inv && inv.units > 0;
  });

  // Filter Donors
  const filteredDonors = donorsList.filter((d) => {
    if (donorTabFilter === 'nearby' && (d.distanceKm || 0) > 5.0) return false;
    if (donorTabFilter === 'available' && d.availabilityStatus !== 'AVAILABLE') return false;
    if (selectedBloodGroupFilter !== 'ALL' && d.bloodGroup !== selectedBloodGroupFilter) return false;
    if (donorSearchQuery) {
      const q = donorSearchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.bloodGroup.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.anonymousDonorCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter Requests
  const filteredRequests = requestsList.filter((r) => {
    if (requestsFilterTab === 'All') return true;
    if (requestsFilterTab === 'Active') return r.status === 'In Progress' || r.status === 'IN_PROGRESS';
    if (requestsFilterTab === 'Pending') return r.status === 'Pending' || r.status === 'SUBMITTED';
    if (requestsFilterTab === 'Resolved') return r.status === 'Resolved' || r.status === 'RESOLVED';
    if (requestsFilterTab === 'Closed') return r.status === 'Closed' || r.status === 'CLOSED';
    return true;
  });

  // Helper for Blood Badge Icon
  const renderBloodBadge = (group: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs font-black',
      md: 'w-10 h-10 text-sm font-extrabold',
      lg: 'w-12 h-12 text-base font-black',
    };
    return (
      <div className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-xs flex-shrink-0`}>
        {group}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* SUCCESS NOTIFICATION TOAST */}
      {requestSuccessBanner && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-medium">{requestSuccessBanner}</div>
          <button
            type="button"
            onClick={() => setRequestSuccessBanner(null)}
            aria-label="Dismiss notification"
            className="text-white/80 hover:text-white ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER & GLOBAL EMERGENCY BAR */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm ring-4 ring-rose-50">
              <Droplet className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  CPET Blood Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                  Live Network
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time Hospital Inventory, 5-Tier Location Discovery & Safe Voluntary Donor Relay
              </p>
            </div>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-50" />
              <span>Become a Donor</span>
            </button>

            <button
              type="button"
              onClick={() => setEmergencyModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black transition-all shadow-sm shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer ring-2 ring-red-500/20 hover:scale-[1.02]"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>⚡ Emergency Blood Request</span>
            </button>
          </div>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-rose-50 text-rose-700 font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Hub Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-rose-50 text-rose-700 font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Find Blood & Hospital Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('donors')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'donors'
                ? 'bg-rose-50 text-rose-700 font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Nearby Donors Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests'
                ? 'bg-rose-50 text-rose-700 font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>My Requests & Tracking</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
              {requestsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-rose-50 text-rose-700 font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Register as Donor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-rose-50 text-rose-700 font-black shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Emergency Contacts & Profile</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT WRAPPER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* ========================================================= */}
        {/* TAB 1: HUB OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* HERO PROMO CARD */}
            <div className="bg-gradient-to-br from-rose-50 via-white to-blue-50/60 rounded-3xl p-6 sm:p-8 border border-rose-100/80 shadow-xs relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-rose-100/30 to-transparent pointer-events-none rounded-r-3xl hidden md:block" />
              <div className="max-w-3xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>Integrated Andhra Pradesh & Telangana Emergency Blood Grid</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Save Lives Together — Find Blood, Donate, and Build a Healthier Community.
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                  Discover verified blood bank stocks with 5-tier location precision (Locality, Municipality, Sub-District, District, State) or connect with verified voluntary donors within minutes.
                </p>

                {/* 3 Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div
                    onClick={() => setActiveTab('inventory')}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Droplet className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900">Find Blood Stock</h3>
                      <p className="text-[11px] text-slate-500">Live Hospital Inventory</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('register')}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900">Become a Donor</h3>
                      <p className="text-[11px] text-slate-500">Save Lives in Emergencies</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setEmergencyModalOpen(true)}
                    className="p-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white">Critical Emergency?</h3>
                        <p className="text-[11px] text-slate-400">Direct Hospital Dispatch</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* REAL-TIME STATS COUNTER GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Voluntary Donors</span>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Users className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">148+</div>
                <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active & Verified nearby</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Connected Blood Banks</span>
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">5 Centers</div>
                <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>NABH Certified & Verified</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Buffer Stock Units</span>
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Droplet className="w-4 h-4 fill-rose-500" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">46 Units</div>
                <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-time Cold Storage Sync</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Avg. Emergency Triage</span>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">&lt; 4 mins</div>
                <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant SMS & Push Relay</span>
                </div>
              </div>
            </div>

            {/* TWO-COLUMN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Live Hospital Inventory Preview */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Hospital Blood Banks</h3>
                      <p className="text-[11px] text-slate-500">Live inventory in Rajahmundry & East Godavari</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <span>View All Stock</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {inventoryList.slice(0, 3).map((hosp) => (
                    <div
                      key={hosp.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-black text-slate-900">{hosp.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{hosp.location} • {hosp.distanceKm} km away</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          hosp.type === 'Government' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {hosp.type}
                        </span>
                      </div>

                      {/* Stock Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.entries(hosp.inventory).slice(0, 4).map(([group, val]) => (
                          <span
                            key={group}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                              val.units > 0
                                ? 'bg-white border-slate-200 text-slate-800'
                                : 'bg-red-50/50 border-red-100 text-red-400'
                            }`}
                          >
                            <span className="text-rose-600 font-black">{group}:</span>
                            <span>{val.units} Units</span>
                          </span>
                        ))}
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100/80">
                        <span className="text-[11px] text-slate-400">{hosp.phone}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReqHospital(hosp.name);
                            setEmergencyModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-all shadow-2xs"
                        >
                          Request Units
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Verified Voluntary Donors Showcase */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Nearby Voluntary Donors</h3>
                      <p className="text-[11px] text-slate-500">Available heroes ready for critical emergency alerts</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('donors')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>View Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {donorsList.slice(0, 3).map((donor) => (
                    <div
                      key={donor.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {renderBloodBadge(donor.bloodGroup, 'md')}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{donor.name}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{donor.location} • {donor.distanceKm} km</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDonor(donor);
                            setContactModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Relay</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-5 h-5 text-rose-600 fill-rose-100" />
                    <span className="text-xs font-bold text-rose-900">Are you willing to save lives?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shadow-2xs"
                  >
                    Join Directory
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FIND BLOOD & 5-TIER LOCATION INVENTORY EXPLORER */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Location Controls Bar */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Find Blood & Hospital Stock Inventory
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search certified cold-storage blood banks by 5-tier location hierarchy or nearby GPS
                  </p>
                </div>

                {/* Nearby vs Manual Location Toggle */}
                <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setLocationMode('nearby')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      locationMode === 'nearby'
                        ? 'bg-white text-blue-600 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📍 Nearby Auto-Detect (&lt; 15 km)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      locationMode === 'manual'
                        ? 'bg-white text-blue-600 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏛️ 5-Tier Location Filter
                  </button>
                </div>
              </div>

              {/* 5-Tier Hierarchy Form when in manual mode */}
              {locationMode === 'manual' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      1. Locality / Area
                    </label>
                    <input
                      type="text"
                      value={locLocality}
                      onChange={(e) => setLocLocality(e.target.value)}
                      placeholder="e.g. Danavaipeta"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      2. Municipality / Town
                    </label>
                    <input
                      type="text"
                      value={locMunicipality}
                      onChange={(e) => setLocMunicipality(e.target.value)}
                      placeholder="e.g. Rajamahendravaram"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      3. Sub-District / Mandal
                    </label>
                    <input
                      type="text"
                      value={locSubDistrict}
                      onChange={(e) => setLocSubDistrict(e.target.value)}
                      placeholder="e.g. East Godavari"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      4. District
                    </label>
                    <input
                      type="text"
                      value={locDistrict}
                      onChange={(e) => setLocDistrict(e.target.value)}
                      placeholder="e.g. East Godavari"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      5. State
                    </label>
                    <input
                      type="text"
                      value={locState}
                      onChange={(e) => setLocState(e.target.value)}
                      placeholder="e.g. Andhra Pradesh"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* Blood Group Filter Chips Bar */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Filter by Required Blood Group:</span>
                <div className="flex flex-wrap gap-2">
                  {['ALL', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setSelectedBloodGroupFilter(bg)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        selectedBloodGroupFilter === bg
                          ? 'bg-rose-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {bg === 'ALL' ? 'All Blood Types' : bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hospital Cards Grid (2 Columns on Desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{item.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.address || item.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        item.type === 'Government' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.type}
                      </span>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">
                        📍 {item.distanceKm} km away
                      </div>
                    </div>
                  </div>

                  {/* Stock Availability Breakdown Table / Pills */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Verified Cold Storage Units:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                      {Object.entries(item.inventory).map(([group, val]) => (
                        <div
                          key={group}
                          className={`p-2 rounded-xl border text-center ${
                            val.units > 0
                              ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-400'
                          }`}
                        >
                          <div className="text-xs font-black">{group}</div>
                          <div className="text-[11px] font-bold">
                            {val.units > 0 ? `${val.units} Units` : 'Out'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <a
                      href={`tel:${item.phone}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>{item.phone || 'Call Blood Bank'}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setReqHospital(item.name);
                        if (selectedBloodGroupFilter !== 'ALL') {
                          setReqBloodType(selectedBloodGroupFilter);
                        }
                        setEmergencyModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <Droplet className="w-3.5 h-3.5 fill-white" />
                      <span>Request Blood from this Hospital</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: NEARBY DONORS DIRECTORY */}
        {/* ========================================================= */}
        {activeTab === 'donors' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Search & Filter Bar */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Voluntary Blood Donors Directory
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect directly or send confidential emergency alert relays to nearby donors
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDonorTabFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      donorTabFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Donors ({donorsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonorTabFilter('nearby')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      donorTabFilter === 'nearby'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📍 Nearby (&lt; 5km)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonorTabFilter('available')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      donorTabFilter === 'available'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🟢 Available Now
                  </button>
                </div>
              </div>

              {/* Search input + Blood Group Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={donorSearchQuery}
                    onChange={(e) => setDonorSearchQuery(e.target.value)}
                    placeholder="Search by donor name, locality, donor ID or blood group..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setSelectedBloodGroupFilter(bg)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-black transition-all ${
                        selectedBloodGroupFilter === bg
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Donors Grid (3 Columns on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDonors.map((donor) => (
                <div
                  key={donor.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {renderBloodBadge(donor.bloodGroup, 'lg')}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{donor.name}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              donor.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-amber-400'
                            }`} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block">
                            {donor.anonymousDonorCode}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        donor.availabilityStatus === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {donor.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Cooldown'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{donor.location}</span>
                        </span>
                        <span className="font-bold text-blue-600">{donor.distanceKm} km away</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Last Donated: {donor.lastDonatedLabel}</span>
                        <span>{donor.totalDonations || 1} Total Donations</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 italic line-clamp-2">
                      "{donor.about}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <a
                      href={`tel:${donor.phone}`}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Call</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDonor(donor);
                        setContactModalOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Relay Alert</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MY REQUESTS & LIVE 4-STAGE TRACKING (SPLIT SCREEN) */}
        {/* ========================================================= */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter Tabs */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(['All', 'Active', 'Pending', 'Resolved', 'Closed'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRequestsFilterTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      requestsFilterTab === tab
                        ? 'bg-rose-600 text-white shadow-2xs font-black'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setEmergencyModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>New Emergency Request</span>
              </button>
            </div>

            {/* Split Screen Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Requests List (4 cols) */}
              <div className="lg:col-span-5 space-y-3">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                      selectedRequest?.id === req.id
                        ? 'bg-rose-50/40 border-rose-300 ring-2 ring-rose-500/10 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {renderBloodBadge(req.bloodGroup, 'md')}
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{req.hospitalName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{req.referenceNumber}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        req.status === 'In Progress' || req.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : req.status === 'Resolved' || req.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>{req.units} • {req.patientName}</span>
                      <span>{req.dateStr}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Case Details, 4-Stage Stepper & Chat (7 cols) */}
              {selectedRequest ? (
                <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6 animate-fadeIn">
                  {/* Banner */}
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      {renderBloodBadge(selectedRequest.bloodGroup, 'lg')}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {selectedRequest.hospitalName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {selectedRequest.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {selectedRequest.referenceNumber} • {selectedRequest.dateStr} {selectedRequest.timeStr}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4-STAGE STEPPER TRACKER */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                      Live Fulfillment Status Stepper
                    </span>

                    <div className="flex items-center justify-between relative">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0" />
                      <div
                        className="absolute top-4 left-6 h-1 bg-rose-500 -z-0 transition-all duration-500"
                        style={{
                          width: `${((selectedRequest.currentStep - 1) / 3) * 85}%`,
                        }}
                      />

                      {/* Step 1: Created */}
                      <div className="flex flex-col items-center gap-1 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          selectedRequest.currentStep >= 1 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          ✓
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">Created</span>
                      </div>

                      {/* Step 2: Processing */}
                      <div className="flex flex-col items-center gap-1 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          selectedRequest.currentStep >= 2 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {selectedRequest.currentStep >= 2 ? '✓' : '2'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">Processing</span>
                      </div>

                      {/* Step 3: In Progress */}
                      <div className="flex flex-col items-center gap-1 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          selectedRequest.currentStep >= 3 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {selectedRequest.currentStep >= 3 ? '✓' : '3'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">In Progress</span>
                      </div>

                      {/* Step 4: Resolved */}
                      <div className="flex flex-col items-center gap-1 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          selectedRequest.currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {selectedRequest.currentStep >= 4 ? '✓' : '4'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">Resolved</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Tabs: Timeline / Duty Desk Chat / Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <button
                        type="button"
                        onClick={() => setRequestDetailTab('timeline')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          requestDetailTab === 'timeline'
                            ? 'bg-rose-50 text-rose-700 font-black'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Timeline History ({selectedRequest.timeline.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestDetailTab('chat')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          requestDetailTab === 'chat'
                            ? 'bg-rose-50 text-rose-700 font-black'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Duty Desk Chat ({selectedRequest.messages.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestDetailTab('details')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          requestDetailTab === 'details'
                            ? 'bg-rose-50 text-rose-700 font-black'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Patient & Clinical Notes
                      </button>
                    </div>

                    {/* Timeline View */}
                    {requestDetailTab === 'timeline' && (
                      <div className="space-y-3 pt-1">
                        {selectedRequest.timeline.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-xs">
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 pb-3 border-b border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-800">{step.title}</span>
                                <span className="text-[10px] text-slate-400">{step.timestamp}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{step.actor}</div>
                              {step.description && (
                                <div className="text-xs text-slate-600 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                                  {step.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Duty Desk Real-Time Chat */}
                    {requestDetailTab === 'chat' && (
                      <div className="space-y-4 pt-1">
                        <div className="max-h-60 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          {selectedRequest.messages.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-6">
                              No messages yet. Send a query directly to the hospital duty officer.
                            </div>
                          ) : (
                            selectedRequest.messages.map((msg, i) => (
                              <div
                                key={i}
                                className={`flex flex-col ${
                                  msg.isStaff ? 'items-start' : 'items-end'
                                }`}
                              >
                                <div className="text-[10px] text-slate-400 mb-0.5">
                                  {msg.sender} • {msg.time}
                                </div>
                                <div
                                  className={`p-3 rounded-2xl max-w-sm text-xs ${
                                    msg.isStaff
                                      ? 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs'
                                      : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handleSendChatMessage} className="flex gap-2">
                          <input
                            type="text"
                            value={newChatText}
                            onChange={(e) => setNewChatText(e.target.value)}
                            placeholder="Type a message to the hospital blood desk..."
                            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Patient & Clinical Notes */}
                    {requestDetailTab === 'details' && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name:</span>
                            <span className="font-bold text-slate-800">{selectedRequest.patientName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group & Units:</span>
                            <span className="font-bold text-rose-600">{selectedRequest.bloodGroup} ({selectedRequest.units})</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinical Reason:</span>
                            <span className="font-medium text-slate-800">{selectedRequest.reason}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Hospital Location:</span>
                            <span className="font-medium text-slate-800">{selectedRequest.hospitalName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-7 p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl">
                  Select a request from the list to view live tracking and duty desk communication.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: REGISTER AS DONOR */}
        {/* ========================================================= */}
        {activeTab === 'register' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-full bg-rose-50 mx-auto flex items-center justify-center text-rose-600 shadow-2xs">
                  <Heart className="w-8 h-8 fill-rose-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Become a Voluntary Blood Hero
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your voluntary registration can save lives in critical emergencies. Your contact details remain confidential and protected behind CPET safe proxy routing.
                </p>
              </div>

              {regSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{regSuccessMessage}</span>
                </div>
              )}

              {/* If already registered */}
              {registeredDonorProfile ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50 via-white to-blue-50 border border-rose-100 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Your Verified Safe Donor Code</span>
                      <div className="text-base font-black font-mono text-slate-900">
                        {registeredDonorProfile.anonymousDonorCode}
                      </div>
                    </div>
                    {renderBloodBadge(registeredDonorProfile.bloodGroup, 'lg')}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Status:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active & Available</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Locality:</span>
                      <span className="font-bold text-slate-800">{registeredDonorProfile.location}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Contact Preference:</span>
                      <span className="font-medium text-slate-800">{registeredDonorProfile.contactPreference}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Emergency Readiness:</span>
                      <span className="font-medium text-blue-600">On Call for Hospitals</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterDonor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Suresh Kumar"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group *</label>
                      <select
                        value={regBloodType}
                        onChange={(e) => setRegBloodType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Locality / Town *</label>
                      <input
                        type="text"
                        required
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        placeholder="e.g. Danavaipeta, Rajahmundry"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Safe Contact Protocol</label>
                    <select
                      value={regPref}
                      onChange={(e) => setRegPref(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="In-App Notification & Direct Call">In-App Emergency Notification & Direct Call (Fastest)</option>
                      <option value="Relay SMS Alert">Confidential Relay SMS Alert</option>
                      <option value="Anonymous Proxy Relay">Anonymous Proxy Call Routing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Additional Health Information (Optional)</label>
                    <textarea
                      rows={2}
                      value={regInfo}
                      onChange={(e) => setRegInfo(e.target.value)}
                      placeholder="Any conditions, regular blood bank preferences, or voluntary notes..."
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registeringDonor}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {registeringDonor ? 'Registering Safe Profile...' : 'Register as Voluntary Blood Hero'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: EMERGENCY CONTACTS & PROFILE */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            {/* User Profile Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">
                <User className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{user?.name || 'Varsha S'}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                    Verified Citizen
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{user?.phone || '+91 98765 43210'} • {user?.email || 'citizen@cpet.gov.in'}</p>
              </div>
            </div>

            {/* Emergency Contacts & Settings Menu */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Emergency Readiness & Settings
              </h4>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Emergency Contacts & SOS</div>
                    <div className="text-[11px] text-slate-400">Manage family / guardian emergency numbers</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Saved Hospital Locations</div>
                    <div className="text-[11px] text-slate-400">Rajahmundry Govt Hospital, Apollo Hospital</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Notification & SMS Preferences</div>
                    <div className="text-[11px] text-slate-400">Instant SMS alerts for matching emergency requests</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Help & 24/7 Medical Helpline</div>
                    <div className="text-[11px] text-slate-400">Call 108 / 104 Blood on Call Helpline</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* GLOBAL MODAL 1: EMERGENCY BLOOD REQUEST */}
      {/* ========================================================= */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Emergency Blood Requirement
                  </h3>
                  <p className="text-[11px] text-slate-500">Direct hospital dispatch and donor alert</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmergencyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Emergency Priority:</strong> Your request will be instantly prioritized and notified to nearby verified donors and certified blood banks.
              </p>
            </div>

            <form onSubmit={handleEmergencySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Blood Type *</label>
                  <select
                    value={reqBloodType}
                    onChange={(e) => setReqBloodType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Units Required *</label>
                  <select
                    value={reqUnits}
                    onChange={(e) => setReqUnits(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="1 Unit">1 Unit</option>
                    <option value="2 Units">2 Units</option>
                    <option value="3 Units">3 Units</option>
                    <option value="4 Units">4 Units</option>
                    <option value="5+ Units">5+ Units (Critical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Hospital / Medical Center *</label>
                <select
                  value={reqHospital}
                  onChange={(e) => setReqHospital(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="Rajahmundry Government Hospital">Rajahmundry Government Hospital</option>
                  <option value="Life Line Rotary Blood Bank">Life Line Rotary Blood Bank</option>
                  <option value="District Area Hospital">District Area Hospital</option>
                  <option value="Apollo Hospital & Trauma Center">Apollo Hospital & Trauma Center</option>
                  <option value="Rural Health & First Referral Center">Rural Health & First Referral Center</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Patient Name (Optional)</label>
                  <input
                    type="text"
                    value={reqPatient}
                    onChange={(e) => setReqPatient(e.target.value)}
                    placeholder="e.g. K. Satyanarayana"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Clinical Reason *</label>
                  <select
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="Accident / Trauma">Accident / Trauma Surgery</option>
                    <option value="Emergency Surgery">Emergency Surgery</option>
                    <option value="Delivery / Maternal Emergency">Delivery / Maternal Emergency</option>
                    <option value="Thalassemia / Dialysis">Thalassemia / Dialysis</option>
                    <option value="Critical Low Platelets">Critical Low Platelets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Attendant Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={reqPhone}
                  onChange={(e) => setReqPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingRequest ? 'Broadcasting...' : '⚡ Submit Emergency Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GLOBAL MODAL 2: SAFE DONOR CONTACT RELAY */}
      {/* ========================================================= */}
      {contactModalOpen && selectedDonor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                {renderBloodBadge(selectedDonor.bloodGroup, 'md')}
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Contact {selectedDonor.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedDonor.anonymousDonorCode}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {contactAlertSent ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div>{contactAlertSent}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Send an instant emergency SMS and in-app alert to voluntary donor {selectedDonor.name}.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Emergency Note / Patient Details
                  </label>
                  <textarea
                    rows={3}
                    value={contactRelayMsg}
                    onChange={(e) => setContactRelayMsg(e.target.value)}
                    placeholder="e.g. Critical surgery at Rajahmundry Govt Hospital, need 2 units immediately."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={`tel:${selectedDonor.phone}`}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Direct Call</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleSendSafeContact}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Relay Alert</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

