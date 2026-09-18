import mongoose from 'mongoose';
import {
  UserRole,
  OrganizationType,
  UserModel,
  CaseType,
  CaseStatus,
  CasePriority,
  ICaseLocation,
  ICaseAttachment,
  ICaseSla,
  ICaseResolution,
  ICaseFeedback,
  CaseEventType,
  ICaseEventAttachment,
  IDepartment,
  IOrgLocation,
  IContactChannel,
  DestinationType,
  DestinationVerificationStatus,
  ICaseRouting,
  ICaseExternalDispatch,
  ICaseEventReadReceipt,
  NotificationType,
  BloodGroup,
  DonorAvailabilityStatus,
  ContactPreference,
  ISlaPolicy,
} from '@cpet/database';

export interface MemoryUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  organizationId?: string | null;
  organizationName?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  consent: {
    termsAccepted: boolean;
    termsVersion: string;
    acceptedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryOrganization {
  _id: string;
  name: string;
  slug: string;
  brandName?: string;
  aliases: string[];
  type: OrganizationType;
  category: string;
  departments: IDepartment[];
  services: string[];
  products: string[];
  serviceCategories: string[];
  locations: IOrgLocation[];
  jurisdictions: string[];
  contactChannels: IContactChannel[];
  status: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  active: boolean;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  settings: {
    autoAssign: boolean;
    defaultSlaHours: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryDestination {
  _id: string;
  organizationId: string;
  departmentId?: string;
  serviceCategory?: string;
  type: DestinationType;
  value: string;
  credentials?: Record<string, any>;
  source: string;
  verificationStatus: DestinationVerificationStatus;
  verifiedDate?: Date;
  activeStatus: boolean;
  reviewDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryNotification {
  _id: string;
  recipientUserId?: string;
  recipientOrgId?: string;
  caseId?: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySession {
  _id: string;
  userId: string;
  refreshTokenHash: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface MemoryOtp {
  _id: string;
  target: string;
  destinationHash?: string;
  otpHash: string;
  purpose: string;
  attempts: number;
  maxAttempts: number;
  isVerified: boolean;
  lastSentAt: Date;
  verifiedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryCase {
  _id: string;
  referenceNumber: string;
  type: CaseType;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  productService?: string;
  structuredData: Record<string, any>;
  location?: ICaseLocation;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  organizationId: string;
  organizationName?: string;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  priority: CasePriority;
  status: CaseStatus;
  routing?: ICaseRouting;
  externalDispatch?: ICaseExternalDispatch;
  attachments: ICaseAttachment[];
  sla: ICaseSla;
  resolution?: ICaseResolution;
  feedback?: ICaseFeedback;
  version: number;
  submittedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryCaseEvent {
  _id: string;
  caseId: string;
  actorId?: string | null;
  actorName: string;
  actorRole: UserRole | 'SYSTEM';
  eventType: CaseEventType;
  previousState?: string | null;
  newState?: string | null;
  message: string;
  isInternal: boolean;
  attachments?: ICaseEventAttachment[];
  readBy?: ICaseEventReadReceipt[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface MemoryDonor {
  _id: string;
  userId?: string;
  anonymousDonorCode: string;
  bloodGroup: BloodGroup;
  availabilityStatus: DonorAvailabilityStatus;
  approximateLocation: {
    locality?: string;
    municipality?: string;
    subDistrict?: string;
    district?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];
  };
  contactPreference: ContactPreference;
  contactPhone: string;
  contactEmail?: string;
  lastDonatedAt?: Date;
  isVerified: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

class MemoryStore {
  public users = new Map<string, MemoryUser>();
  public organizations = new Map<string, MemoryOrganization>();
  public destinations = new Map<string, MemoryDestination>();
  public notifications = new Map<string, MemoryNotification>();
  public sessions = new Map<string, MemorySession>();
  public otps = new Map<string, MemoryOtp>();
  public cases = new Map<string, MemoryCase>();
  public caseEvents = new Map<string, MemoryCaseEvent[]>(); // keyed by caseId
  public donors = new Map<string, MemoryDonor>();
  public slaPolicies = new Map<string, any>();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    const orgId = '66d000000000000000000010';
    this.organizations.set(orgId, {
      _id: orgId,
      name: 'Apex Power & Water',
      slug: 'apex-power-water',
      brandName: 'Apex',
      aliases: ['apex', 'apex power', 'apex water'],
      type: 'UTILITY',
      category: 'Public Infrastructure',
      departments: [
        { id: 'DEP-APX-ELEC', name: 'Electric Distribution & Grid', code: 'ELEC-01', active: true, contactEmail: 'grid@apexutility.org' },
        { id: 'DEP-APX-WATER', name: 'Municipal Water & Sanitation', code: 'WATER-01', active: true, contactEmail: 'water@apexutility.org' },
        { id: 'DEP-APX-BILL', name: 'Commercial Metering & Billing', code: 'BILL-01', active: true, contactEmail: 'billing@apexutility.org' },
      ],
      services: ['Pipeline Leakage', 'Transformer Maintenance', 'Meter Calibration', 'Voltage Issue'],
      products: ['Municipal Water Pipeline', 'Electric Distribution Line', 'Smart Energy Meter'],
      serviceCategories: ['Public Utilities', 'Consumer Grievance'],
      locations: [
        { city: 'Metro City', state: 'Metro State', pincodes: ['500001', '500002'], address: 'Suite 400, Civic Center', isHeadquarters: true },
        { city: 'Hyderabad', state: 'Telangana', pincodes: ['500081'], address: 'Hitec City Utilities Center' },
      ],
      jurisdictions: ['Metro City', 'Greater Hyderabad', 'Telangana'],
      contactChannels: [
        { type: 'EMAIL', value: 'support@apexutility.org', isPrimary: true },
        { type: 'PHONE', value: '+1 555-0199', isPrimary: false },
      ],
      status: 'VERIFIED',
      active: true,
      contactEmail: 'support@apexutility.org',
      contactPhone: '+1 555-0199',
      address: 'Suite 400, Civic Center',
      settings: {
        autoAssign: false,
        defaultSlaHours: 48,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Apex Destinations
    this.destinations.set('66d200000000000000000010', {
      _id: '66d200000000000000000010',
      organizationId: orgId,
      departmentId: 'DEP-APX-ELEC',
      type: 'INTERNAL_QUEUE',
      value: 'apex-triage-queue',
      source: 'OFFICIAL_REGISTRY',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.destinations.set('66d200000000000000000011', {
      _id: '66d200000000000000000011',
      organizationId: orgId,
      departmentId: 'DEP-APX-WATER',
      type: 'OFFICIAL_PORTAL',
      value: 'https://grievance.apexutility.gov.in',
      source: 'GOVERNMENT_REGISTRY',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Lloyd Organization
    const lloydOrgId = '66d000000000000000000030';
    this.organizations.set(lloydOrgId, {
      _id: lloydOrgId,
      name: 'Lloyd (Havells Consumer Appliances)',
      slug: 'lloyd',
      brandName: 'Lloyd',
      aliases: ['lloyd', 'लॉयड', 'లాయిడ్', 'havells', 'havells-lloyd'],
      type: 'CONSUMER_GOODS',
      category: 'Consumer Appliance & Utilities',
      departments: [
        { id: 'DEP-LLD-TECH', name: 'Technical Field Service & AC Care', code: 'TECH-01', active: true, contactEmail: 'service.south@lloyd.in' },
        { id: 'DEP-LLD-CARE', name: 'Customer Care & Warranty Desk', code: 'CARE-01', active: true, contactEmail: 'customercare@lloyd.in' },
        { id: 'DEP-LLD-GRIEVANCE', name: 'Consumer Grievance & Escalations', code: 'ESC-01', active: true, contactEmail: 'grievance@lloyd.in' },
      ],
      services: ['AC Servicing', 'Gas Leak Repair', 'Cooling Defect / Gas Check', 'Periodic Maintenance Service', 'Installation'],
      products: ['Lloyd Air Conditioner', 'Split Air Conditioner', 'Window AC', 'Home Refrigerator'],
      serviceCategories: ['Consumer Appliance & Utilities', 'HVAC'],
      locations: [
        { city: 'Hyderabad', state: 'Telangana', pincodes: ['500001', '500081', '500032'], address: 'Havells-Lloyd Service Hub, Begumpet', isHeadquarters: false },
        { city: 'National', state: 'All India', address: 'Noida HQ', isHeadquarters: true },
      ],
      jurisdictions: ['Greater Hyderabad', 'Telangana', 'National'],
      contactChannels: [
        { type: 'EMAIL', value: 'customercare@lloyd.in', isPrimary: true },
        { type: 'PHONE', value: '1800-102-2253', isPrimary: false },
      ],
      status: 'VERIFIED',
      active: true,
      contactEmail: 'customercare@lloyd.in',
      contactPhone: '1800-102-2253',
      address: 'Havells India Ltd, Q4, Noida',
      settings: {
        autoAssign: true,
        defaultSlaHours: 48,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Lloyd Destinations
    this.destinations.set('66d200000000000000000001', {
      _id: '66d200000000000000000001',
      organizationId: lloydOrgId,
      departmentId: 'DEP-LLD-TECH',
      type: 'INTERNAL_QUEUE',
      value: 'lloyd-ac-triage-queue',
      source: 'OFFICIAL_REGISTRY',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.destinations.set('66d200000000000000000002', {
      _id: '66d200000000000000000002',
      organizationId: lloydOrgId,
      departmentId: 'DEP-LLD-CARE',
      type: 'EMAIL',
      value: 'service.hyderabad@lloyd.in',
      source: 'OFFICIAL_REGISTRY',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.destinations.set('66d200000000000000000003', {
      _id: '66d200000000000000000003',
      organizationId: lloydOrgId,
      departmentId: 'DEP-LLD-TECH',
      type: 'API',
      value: 'https://api.lloyd.in/v1/tickets',
      source: 'OFFICIAL_API',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Samsung Organization (for Multi-Brand Service Requests)
    const samsungOrgId = '66d000000000000000000040';
    this.organizations.set(samsungOrgId, {
      _id: samsungOrgId,
      name: 'Samsung India Electronics',
      slug: 'samsung-india',
      brandName: 'Samsung',
      aliases: ['samsung', 'सैमसंग', 'శామ్‌సంగ్', 'samsung-india'],
      type: 'CONSUMER_GOODS',
      category: 'Consumer Appliance & Utilities',
      departments: [
        { id: 'DEP-SAM-TECH', name: 'Samsung Technical Care & HVAC Support', code: 'SAM-TECH', active: true, contactEmail: 'support@samsung.com' },
        { id: 'DEP-SAM-CARE', name: 'Digital Appliances Support Desk', code: 'SAM-CARE', active: true, contactEmail: 'service@samsung.com' },
      ],
      services: ['AC Servicing', 'Compressor Check', 'Gas Leak Repair', 'Refrigerator Servicing', 'Washing Machine Repair'],
      products: ['Samsung Split AC', 'Samsung WindFree AC', 'Samsung Curd Maestro Refrigerator', 'Samsung EcoBubble Washing Machine'],
      serviceCategories: ['Consumer Appliance & Utilities', 'Digital Electronics'],
      locations: [
        { city: 'Hyderabad', state: 'Telangana', pincodes: ['500081', '500032'], address: 'Samsung SmartPlaza Service Hub, Hitec City', isHeadquarters: false },
        { city: 'National', state: 'All India', address: 'Samsung Two Horizon Center, Gurugram', isHeadquarters: true },
      ],
      jurisdictions: ['Greater Hyderabad', 'Telangana', 'National'],
      contactChannels: [
        { type: 'EMAIL', value: 'support@samsung.com', isPrimary: true },
        { type: 'PHONE', value: '1800-40-7267864', isPrimary: false },
      ],
      status: 'VERIFIED',
      active: true,
      contactEmail: 'support@samsung.com',
      contactPhone: '1800-40-7267864',
      address: 'Samsung Electronics, Gurugram',
      settings: {
        autoAssign: true,
        defaultSlaHours: 48,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Samsung Destination
    this.destinations.set('66d200000000000000000041', {
      _id: '66d200000000000000000041',
      organizationId: samsungOrgId,
      departmentId: 'DEP-SAM-TECH',
      type: 'INTERNAL_QUEUE',
      value: 'samsung-triage-queue',
      source: 'OFFICIAL_REGISTRY',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Red Cross Emergency Blood Center Organization
    const redCrossOrgId = '66d000000000000000000050';
    this.organizations.set(redCrossOrgId, {
      _id: redCrossOrgId,
      name: 'Red Cross Blood Center & Trauma Care',
      slug: 'red-cross-blood-center',
      brandName: 'Red Cross',
      aliases: ['red cross', 'redcross', 'blood bank', 'blood center'],
      type: 'HEALTHCARE',
      category: 'Emergency Healthcare',
      departments: [
        { id: 'DEP-RC-BLOOD', name: 'Emergency Blood & Donor Coordination', code: 'RC-BLOOD', active: true, contactEmail: 'emergency@redcrossblood.org' },
      ],
      services: ['Whole Blood Transfusion', 'Platelet Extraction', 'Emergency Cross-Matching', 'Rare Blood Group Registry'],
      products: ['Blood Units', 'Single Donor Platelets', 'Fresh Frozen Plasma'],
      serviceCategories: ['Emergency Healthcare', 'Blood Bank Coordination'],
      locations: [
        { city: 'Hyderabad', state: 'Telangana', pincodes: ['500001', '500081'], address: 'Central Blood Bank, Vidyanagar', isHeadquarters: true },
      ],
      jurisdictions: ['Greater Hyderabad', 'Telangana', 'National'],
      contactChannels: [
        { type: 'EMAIL', value: 'emergency@redcrossblood.org', isPrimary: true },
        { type: 'PHONE', value: '1800-BLOOD-HELP', isPrimary: true },
      ],
      status: 'VERIFIED',
      active: true,
      contactEmail: 'emergency@redcrossblood.org',
      contactPhone: '1800-BLOOD-HELP',
      address: 'Central Red Cross Blood Bank, Vidyanagar, Hyderabad',
      settings: {
        autoAssign: true,
        defaultSlaHours: 12,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.destinations.set('66d200000000000000000051', {
      _id: '66d200000000000000000051',
      organizationId: redCrossOrgId,
      departmentId: 'DEP-RC-BLOOD',
      type: 'INTERNAL_QUEUE',
      value: 'redcross-blood-desk',
      source: 'OFFICIAL_REGISTRY',
      verificationStatus: 'VERIFIED',
      verifiedDate: new Date(),
      activeStatus: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const citizenId = '66d000000000000000000099';
    const validBcryptHash = '$2a$10$ass1bfGFHOXTHEJYXiVLF.iF76n6EY16LvbP7Ev43ZuoB00E0b8kq'; // Password123!

    this.users.set(citizenId, {
      _id: citizenId,
      name: 'Dev Citizen',
      email: 'citizen@cpet.org',
      phone: '+1 555-0199',
      passwordHash: validBcryptHash,
      role: 'CITIZEN',
      organizationId: null,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      consent: {
        termsAccepted: true,
        termsVersion: '1.0',
        acceptedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const orgAdminId = '66d000000000000000000011';
    this.users.set(orgAdminId, {
      _id: orgAdminId,
      name: 'Apex Admin',
      email: 'admin@apexutility.org',
      phone: '+1 555-0199',
      passwordHash: validBcryptHash,
      role: 'ORGANIZATION_ADMIN',
      organizationId: orgId,
      organizationName: 'Apex Power & Water',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      consent: {
        termsAccepted: true,
        termsVersion: '1.0',
        acceptedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const orgAgentId = '66d000000000000000000012';
    this.users.set(orgAgentId, {
      _id: orgAgentId,
      name: 'Apex Agent Alice',
      email: 'alice@apexutility.org',
      phone: '+1 555-0198',
      passwordHash: validBcryptHash,
      role: 'ORGANIZATION_AGENT',
      organizationId: orgId,
      organizationName: 'Apex Power & Water',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      consent: {
        termsAccepted: true,
        termsVersion: '1.0',
        acceptedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const lloydAgentId = '66d000000000000000000032';
    this.users.set(lloydAgentId, {
      _id: lloydAgentId,
      name: 'Lloyd Support Specialist',
      email: 'support@lloyd.in',
      phone: '+91 9876543210',
      passwordHash: validBcryptHash,
      role: 'ORGANIZATION_AGENT',
      organizationId: lloydOrgId,
      organizationName: 'Lloyd (Havells Consumer Appliances)',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      consent: {
        termsAccepted: true,
        termsVersion: '1.0',
        acceptedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Sample Case 1: Service Request
    const case1Id = '66d100000000000000000001';
    const due1 = new Date(Date.now() + 43 * 3600 * 1000);
    this.cases.set(case1Id, {
      _id: case1Id,
      referenceNumber: 'CPET-2026-001',
      type: 'SERVICE_REQUEST',
      title: 'Defective consumer unit electrical failure',
      description: 'Defective consumer unit electrical failure within 48 hours of purchase. Seeking replacement under warranty.',
      category: 'Consumer Goods',
      subcategory: 'Power Electronics',
      productService: 'Apex Transformer Model X-1',
      structuredData: {
        serialNumber: 'SN-APX-99882',
        purchaseDate: '2026-09-01',
        warrantyValid: true,
      },
      location: {
        city: 'Metro City',
        address: '42 Civic Avenue',
        pincode: '500001',
      },
      requesterId: citizenId,
      requesterName: 'Dev Citizen',
      requesterEmail: 'citizen@cpet.org',
      requesterPhone: '+1 555-0199',
      organizationId: orgId,
      organizationName: 'Apex Power & Water',
      assignedAgentId: null,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      attachments: [],
      sla: {
        dueAt: due1,
        slaHours: 48,
        isEscalated: false,
      },
      version: 2,
      submittedAt: new Date(Date.now() - 5 * 3600 * 1000),
      acknowledgedAt: new Date(Date.now() - 4 * 3600 * 1000),
      createdAt: new Date(Date.now() - 5 * 3600 * 1000),
      updatedAt: new Date(),
    });

    this.caseEvents.set(case1Id, [
      {
        _id: 'evt-101',
        caseId: case1Id,
        actorId: citizenId,
        actorName: 'Dev Citizen',
        actorRole: 'CITIZEN',
        eventType: 'CASE_CREATED',
        previousState: null,
        newState: 'SUBMITTED',
        message: 'Request created and submitted with warranty proof.',
        isInternal: false,
        timestamp: new Date(Date.now() - 5 * 3600 * 1000),
      },
      {
        _id: 'evt-102',
        caseId: case1Id,
        actorId: null,
        actorName: 'CPET Routing Gateway',
        actorRole: 'SYSTEM',
        eventType: 'STATUS_CHANGE',
        previousState: 'SUBMITTED',
        newState: 'ACKNOWLEDGED',
        message: 'Validated serial number and routed to Consumer Support queue with standard 48-hour SLA.',
        isInternal: false,
        timestamp: new Date(Date.now() - 4 * 3600 * 1000),
      },
      {
        _id: 'evt-103',
        caseId: case1Id,
        actorId: orgId,
        actorName: 'Support Desk Agent',
        actorRole: 'ORGANIZATION_AGENT',
        eventType: 'STATUS_CHANGE',
        previousState: 'ACKNOWLEDGED',
        newState: 'IN_PROGRESS',
        message: 'Technician dispatched for on-site inspection under warranty.',
        isInternal: false,
        timestamp: new Date(Date.now() - 2 * 3600 * 1000),
      },
    ]);

    // Seed Sample Case 2: Complaint
    const case2Id = '66d100000000000000000002';
    const due2 = new Date(Date.now() + 47 * 3600 * 1000);
    this.cases.set(case2Id, {
      _id: case2Id,
      referenceNumber: 'CPET-2026-002',
      type: 'COMPLAINT',
      title: 'Delayed public transit route escalation',
      description: 'Route #42 civic bus delayed by over 45 minutes consistently during peak evening commute.',
      category: 'Transport',
      subcategory: 'Bus Transit',
      productService: 'Civic Metro Line #42',
      structuredData: {
        busRoute: '42-East',
        incidentDate: '2026-09-10',
      },
      location: {
        city: 'Metro City',
        address: 'Terminal 3',
        pincode: '500002',
      },
      requesterId: citizenId,
      requesterName: 'Dev Citizen',
      requesterEmail: 'citizen@cpet.org',
      organizationId: orgId,
      organizationName: 'Apex Power & Water',
      assignedAgentId: null,
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      attachments: [],
      sla: {
        dueAt: due2,
        slaHours: 48,
        isEscalated: false,
      },
      version: 1,
      submittedAt: new Date(Date.now() - 1 * 3600 * 1000),
      createdAt: new Date(Date.now() - 1 * 3600 * 1000),
      updatedAt: new Date(),
    });

    this.caseEvents.set(case2Id, [
      {
        _id: 'evt-201',
        caseId: case2Id,
        actorId: citizenId,
        actorName: 'Dev Citizen',
        actorRole: 'CITIZEN',
        eventType: 'CASE_CREATED',
        previousState: null,
        newState: 'SUBMITTED',
        message: 'Formal grievance filed regarding schedule deviation.',
        isInternal: false,
        timestamp: new Date(Date.now() - 1 * 3600 * 1000),
      },
    ]);

    // Seed Sample Case 3: Blood Request
    const case3Id = '66d100000000000000000003';
    const due3 = new Date(Date.now() + 6 * 3600 * 1000);
    this.cases.set(case3Id, {
      _id: case3Id,
      referenceNumber: 'CPET-2026-003',
      type: 'BLOOD_REQUEST',
      title: 'Emergency O-Negative units required at City Trauma Care',
      description: 'Urgent need for 2 units of O-Negative whole blood for emergency orthopedic surgery.',
      category: 'Healthcare',
      subcategory: 'Emergency Blood Requirement',
      productService: 'Blood Bank Coordination',
      structuredData: {
        bloodGroup: 'O-',
        unitsNeeded: 2,
        hospitalName: 'Metro City Trauma Hospital',
        patientName: 'R. Sharma',
        attendantPhone: '+1 555-0199',
      },
      location: {
        city: 'Metro City',
        address: 'Metro City Trauma Hospital, Emergency Ward 2B',
        pincode: '500005',
      },
      requesterId: citizenId,
      requesterName: 'Dev Citizen',
      requesterEmail: 'citizen@cpet.org',
      organizationId: orgId,
      organizationName: 'Apex Power & Water',
      assignedAgentId: null,
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      attachments: [],
      sla: {
        dueAt: due3,
        slaHours: 12,
        isEscalated: false,
      },
      version: 2,
      submittedAt: new Date(Date.now() - 2 * 3600 * 1000),
      acknowledgedAt: new Date(Date.now() - 1.5 * 3600 * 1000),
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      updatedAt: new Date(),
    });

    this.caseEvents.set(case3Id, [
      {
        _id: 'evt-301',
        caseId: case3Id,
        actorId: citizenId,
        actorName: 'Dev Citizen',
        actorRole: 'CITIZEN',
        eventType: 'CASE_CREATED',
        previousState: null,
        newState: 'SUBMITTED',
        message: 'Emergency request generated with priority response flag.',
        isInternal: false,
        timestamp: new Date(Date.now() - 2 * 3600 * 1000),
      },
      {
        _id: 'evt-302',
        caseId: case3Id,
        actorId: orgId,
        actorName: 'Emergency Response Lead',
        actorRole: 'ORGANIZATION_AGENT',
        eventType: 'STATUS_CHANGE',
        previousState: 'SUBMITTED',
        newState: 'IN_PROGRESS',
        message: 'Dispatched broadcast alert to matching O- registered donors in 10km radius.',
        isInternal: false,
        timestamp: new Date(Date.now() - 1.5 * 3600 * 1000),
      },
    ]);

    // Seed Voluntary Blood Donors with 5-Level Geographic Distribution
    this.donors.clear();

    // Donor 1: LEVEL 1 (Same Locality - Madhapur, < 3km from Hitec City)
    this.donors.set('dnr-001', {
      _id: 'dnr-001',
      userId: citizenId,
      anonymousDonorCode: 'DONOR-HYD-1001',
      bloodGroup: 'O-',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Madhapur',
        municipality: 'Greater Hyderabad',
        subDistrict: 'Serilingampally',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        coordinates: [78.3845, 17.4483], // Madhapur center
      },
      contactPreference: 'IN_APP',
      contactPhone: '+91 9876543210',
      contactEmail: 'citizen@cpet.org',
      lastDonatedAt: new Date(Date.now() - 120 * 86400 * 1000),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Donor 2: LEVEL 2 (Same Municipality / Town - Gachibowli, ~3.5km from Madhapur)
    this.donors.set('dnr-002', {
      _id: 'dnr-002',
      anonymousDonorCode: 'DONOR-HYD-1002',
      bloodGroup: 'O-',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Gachibowli',
        municipality: 'Greater Hyderabad',
        subDistrict: 'Serilingampally',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
        coordinates: [78.3578, 17.4401], // Gachibowli (~3.5km)
      },
      contactPreference: 'RELAY_SMS',
      contactPhone: '+91 9876543211',
      contactEmail: 'donor2@volunteer.org',
      lastDonatedAt: new Date(Date.now() - 95 * 86400 * 1000),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Donor 3: LEVEL 3 (Same Mandal / Sub-District - Serilingampally, ~10km from Madhapur)
    this.donors.set('dnr-003', {
      _id: 'dnr-003',
      anonymousDonorCode: 'DONOR-HYD-1003',
      bloodGroup: 'O-',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Tara Nagar',
        municipality: 'Serilingampally Municipality',
        subDistrict: 'Serilingampally',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500019',
        coordinates: [78.3182, 17.4851], // Serilingampally town (~10km)
      },
      contactPreference: 'IN_APP',
      contactPhone: '+91 9876543212',
      contactEmail: 'donor3@volunteer.org',
      lastDonatedAt: new Date(Date.now() - 110 * 86400 * 1000),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Donor 4: LEVEL 4 (Same District - Secunderabad, ~16km from Madhapur)
    this.donors.set('dnr-004', {
      _id: 'dnr-004',
      anonymousDonorCode: 'DONOR-HYD-1004',
      bloodGroup: 'O-',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Secunderabad Cantt',
        municipality: 'Secunderabad',
        subDistrict: 'Secunderabad Mandal',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500003',
        coordinates: [78.501, 17.4399], // Secunderabad (~16km)
      },
      contactPreference: 'ANONYMOUS_PROXY',
      contactPhone: '+91 9876543213',
      contactEmail: 'donor4@volunteer.org',
      lastDonatedAt: new Date(Date.now() - 150 * 86400 * 1000),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Donor 5: LEVEL 5 (Same State - Warangal Urban, ~140km from Madhapur)
    this.donors.set('dnr-005', {
      _id: 'dnr-005',
      anonymousDonorCode: 'DONOR-WGL-1005',
      bloodGroup: 'O-',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Hanamkonda',
        municipality: 'Warangal',
        subDistrict: 'Warangal Mandal',
        district: 'Warangal Urban',
        state: 'Telangana',
        pincode: '506001',
        coordinates: [79.5941, 17.9689], // Warangal (~140km)
      },
      contactPreference: 'PHONE',
      contactPhone: '+91 9876543214',
      contactEmail: 'donor5@volunteer.org',
      lastDonatedAt: new Date(Date.now() - 180 * 86400 * 1000),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Donors for other groups (O+, A+, B+, AB+)
    this.donors.set('dnr-006', {
      _id: 'dnr-006',
      anonymousDonorCode: 'DONOR-HYD-1006',
      bloodGroup: 'O+',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Madhapur',
        municipality: 'Greater Hyderabad',
        subDistrict: 'Serilingampally',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        coordinates: [78.3845, 17.4483],
      },
      contactPreference: 'IN_APP',
      contactPhone: '+91 9876543215',
      contactEmail: 'donor6@volunteer.org',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.donors.set('dnr-007', {
      _id: 'dnr-007',
      anonymousDonorCode: 'DONOR-HYD-1007',
      bloodGroup: 'A+',
      availabilityStatus: 'AVAILABLE',
      approximateLocation: {
        locality: 'Kukatpally',
        municipality: 'Greater Hyderabad',
        subDistrict: 'Kukatpally',
        district: 'Medchal-Malkajgiri',
        state: 'Telangana',
        pincode: '500072',
        coordinates: [78.4111, 17.4849],
      },
      contactPreference: 'IN_APP',
      contactPhone: '+91 9876543216',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Global Default SLA & Escalation Policy
    this.slaPolicies.set('sla-policy-global-default', {
      _id: 'sla-policy-global-default',
      name: 'Global Standard SLA & Multi-Tier Escalation Policy',
      organizationId: null,
      caseType: null,
      priority: 'MEDIUM',
      acknowledgementHours: 4,
      firstResponseHours: 8,
      resolutionHours: 48,
      businessHours: {
        enabled: true,
        start: '09:00',
        end: '18:00',
        timezone: 'Asia/Kolkata',
        workingDays: [1, 2, 3, 4, 5],
      },
      holidays: ['2026-01-26', '2026-08-15', '2026-10-02'],
      escalationPolicy: {
        enabled: true,
        tiers: [
          {
            level: 1,
            tierName: 'Tier 1: Frontline Operations Desk',
            triggerAfterBreachMinutes: 0,
            assignDepartment: 'General Operations',
            escalationReason: 'Acknowledgement or Initial Resolution SLA breached.',
          },
          {
            level: 2,
            tierName: 'Tier 2: Senior Engineering & Supervisor Desk',
            triggerAfterBreachMinutes: 120,
            assignDepartment: 'Senior Engineering & Grievances',
            escalationReason: 'Continued non-resolution after 2 hours; escalated to supervisor.',
          },
          {
            level: 3,
            tierName: 'Tier 3: District Ombudsman & Regulatory Officer',
            triggerAfterBreachMinutes: 360,
            assignDepartment: 'District Oversight Cell',
            escalationReason: 'Escalated to District Ombudsman Authority.',
          },
          {
            level: 4,
            tierName: 'Tier 4: State Public Grievance Directorate',
            triggerAfterBreachMinutes: 720,
            assignDepartment: 'State Regulatory Commission',
            escalationReason: 'Critical escalation to State Consumer & Grievance Directorate.',
          },
        ],
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Blood Emergency 24x7 SLA Policy
    this.slaPolicies.set('sla-policy-blood-emergency', {
      _id: 'sla-policy-blood-emergency',
      name: 'Emergency Healthcare & Blood Requirement SLA Policy',
      organizationId: null,
      caseType: 'BLOOD_REQUEST',
      priority: 'URGENT',
      acknowledgementHours: 0.5,
      firstResponseHours: 1,
      resolutionHours: 6,
      businessHours: {
        enabled: false, // 24x7 immediate emergency response
        start: '00:00',
        end: '23:59',
        timezone: 'Asia/Kolkata',
        workingDays: [0, 1, 2, 3, 4, 5, 6],
      },
      escalationPolicy: {
        enabled: true,
        tiers: [
          {
            level: 1,
            tierName: 'Tier 1: Blood Bank Emergency Dispatcher',
            triggerAfterBreachMinutes: 0,
            assignDepartment: 'Emergency Blood & Donor Coordination',
            escalationReason: 'Urgent blood requirement acknowledged for immediate dispatch.',
          },
          {
            level: 2,
            tierName: 'Tier 2: Senior Trauma Care & Critical Lead',
            triggerAfterBreachMinutes: 30,
            assignDepartment: 'Trauma ICU Coordination',
            escalationReason: 'High priority blood supply escalation to Trauma Director.',
          },
        ],
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Lloyd Organization Custom SLA Policy
    this.slaPolicies.set('sla-policy-lloyd', {
      _id: 'sla-policy-lloyd',
      name: 'Lloyd Consumer Care & AC Service SLA Policy',
      organizationId: '66d000000000000000000030',
      caseType: 'SERVICE_REQUEST',
      priority: 'HIGH',
      acknowledgementHours: 2,
      firstResponseHours: 4,
      resolutionHours: 24,
      businessHours: {
        enabled: true,
        start: '09:00',
        end: '19:00',
        timezone: 'Asia/Kolkata',
        workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
      },
      escalationPolicy: {
        enabled: true,
        tiers: [
          {
            level: 1,
            tierName: 'Tier 1: Technical Field Service & AC Care',
            triggerAfterBreachMinutes: 0,
            assignDepartment: 'DEP-LLD-TECH',
            escalationReason: 'Service window opened; assigned to frontline AC technician.',
          },
          {
            level: 2,
            tierName: 'Tier 2: Consumer Grievance & Escalations Desk',
            triggerAfterBreachMinutes: 60,
            assignDepartment: 'DEP-LLD-GRIEVANCE',
            escalationReason: 'Technician dispatch delayed; escalated to Consumer Grievance Desk.',
          },
        ],
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public isDbConnected(): boolean {
    return (
      mongoose.connection.readyState === 1 ||
      Boolean((UserModel.findOne as any)?._isMockFunction) ||
      Boolean((UserModel.findById as any)?._isMockFunction)
    );
  }
}

export const memoryStore = new MemoryStore();
