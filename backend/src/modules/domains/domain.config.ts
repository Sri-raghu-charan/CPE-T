import { z } from 'zod';
import { CaseType, CasePriority } from '@cpet/database';

export interface DomainCategory {
  id: string;
  name: string;
  subcategories?: string[];
}

export interface DomainFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'phone';
  required: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

export interface DomainConfig {
  type: CaseType;
  displayName: string;
  description: string;
  badge: string;
  categories: DomainCategory[];
  targetTypes?: string[];
  fieldDefinitions: DomainFieldDef[];
  schema: z.ZodObject<any>;
  slaHours: {
    URGENT: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  allowedTransitions: string[];
}

export const domainConfigs: Record<string, DomainConfig> = {
  SERVICE_REQUEST: {
    type: 'SERVICE_REQUEST',
    displayName: 'Universal Service Request',
    description: 'Submit an official service request, maintenance booking, or warranty claim for appliances, equipment, and utilities.',
    badge: 'Standard SLA',
    categories: [
      {
        id: 'consumer-appliances',
        name: 'Consumer Appliances & Electronics',
        subcategories: ['Split Air Conditioner', 'Window AC', 'Home Refrigerator', 'Washing Machine', 'Smart Television', 'Microwave'],
      },
      {
        id: 'power-utilities',
        name: 'Power & Electrical Infrastructure',
        subcategories: ['Transformer Maintenance', 'Meter Calibration', 'Voltage Fluctuation', 'Line Fault'],
      },
      {
        id: 'water-utilities',
        name: 'Water & Municipal Supply',
        subcategories: ['Pipeline Leakage', 'Water Pressure Issue', 'Smart Flow Meter'],
      },
      {
        id: 'hvac-commercial',
        name: 'HVAC & Facility Equipment',
        subcategories: ['Central Chiller', 'Ventilation Fan', 'Duct Cleaning'],
      },
    ],
    fieldDefinitions: [
      { name: 'productService', label: 'Product / Appliance / Service Name', type: 'text', required: true, placeholder: 'e.g. Lloyd Split AC 1.5 Ton / Samsung Refrigerator' },
      { name: 'issueType', label: 'Service / Fault Type', type: 'select', required: true, options: ['Periodic Maintenance Service', 'Cooling Defect / Gas Check', 'Defective Compressor', 'Water Leakage', 'Electrical / Power Failure', 'Installation / Relocation'] },
      { name: 'brand', label: 'Brand / Manufacturer', type: 'text', required: false, placeholder: 'e.g. Lloyd, Samsung, LG, Voltas, Apex' },
      { name: 'serialNumber', label: 'Serial Number / Asset ID', type: 'text', required: false, placeholder: 'e.g. SN-LLD-98124' },
      { name: 'modelNumber', label: 'Model Number', type: 'text', required: false, placeholder: 'e.g. GLS18I56WGE' },
      { name: 'purchaseDate', label: 'Approximate Purchase Date', type: 'date', required: false },
      { name: 'warrantyValid', label: 'Under Active Warranty', type: 'select', required: false, options: ['Yes - Verified Proof Available', 'No - Out of Warranty', 'Unknown / Expired'] },
      { name: 'preferredSlot', label: 'Preferred Technician Visit Slot', type: 'select', required: false, options: ['Morning (9:00 AM - 1:00 PM)', 'Afternoon (1:00 PM - 5:00 PM)', 'Evening (5:00 PM - 8:00 PM)', 'Anytime'] },
    ],
    schema: z.object({
      issueType: z.string().min(1, 'Issue type is required'),
      brand: z.string().optional(),
      serialNumber: z.string().optional(),
      modelNumber: z.string().optional(),
      purchaseDate: z.string().optional(),
      warrantyValid: z.any().optional(),
      preferredSlot: z.string().optional(),
    }),
    slaHours: {
      URGENT: 12,
      HIGH: 24,
      MEDIUM: 48,
      LOW: 72,
    },
    allowedTransitions: ['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'],
  },

  COMPLAINT: {
    type: 'COMPLAINT',
    displayName: 'Universal Complaint & Grievance',
    description: 'File a formal grievance against a product, service, organization, institution, or public/private facility for regulatory escalation.',
    badge: 'Escalation Protocol',
    categories: [
      {
        id: 'billing-dispute',
        name: 'Billing & Commercial Disputes',
        subcategories: ['Excessive Tariff / Meter Tampering', 'Overcharging Beyond MRP', 'Unauthorized Debit / Fees', 'Refund Refusal'],
      },
      {
        id: 'product-defect',
        name: 'Product Quality & Warranty Breach',
        subcategories: ['Dead on Arrival (DOA)', 'Warranty Service Refusal', 'Repeated Mechanical Failure', 'Safety Hazard / Fire Risk'],
      },
      {
        id: 'service-deficiency',
        name: 'Service Deficiency & SLA Breach',
        subcategories: ['Technician No-Show', 'Unresolved Escalation', 'Incomplete Repair', 'Rude Staff Conduct'],
      },
      {
        id: 'facility-institution',
        name: 'Institutional & Facility Malfunction',
        subcategories: ['Hospital Care Malpractice', 'Public Transit Breakdown', 'College / Educational Administration', 'Civic Office Delay'],
      },
    ],
    targetTypes: ['PRODUCT', 'SERVICE', 'ORGANIZATION', 'INSTITUTION', 'FACILITY'],
    fieldDefinitions: [
      { name: 'targetType', label: 'Complaint Target Type', type: 'select', required: true, options: ['PRODUCT', 'SERVICE', 'ORGANIZATION', 'INSTITUTION', 'FACILITY'] },
      { name: 'targetName', label: 'Target Entity / Brand / Facility Name', type: 'text', required: true, placeholder: 'e.g. Apex Utilities / Metro Hospital / Apex Transformer' },
      { name: 'complaintType', label: 'Primary Cause of Grievance', type: 'select', required: true, options: ['Billing Dispute', 'Warranty Refusal', 'Service Delay / SLA Breach', 'Defective Goods', 'Harassment / Misconduct', 'Facility Non-Functioning'] },
      { name: 'incidentDate', label: 'Date of Occurrence', type: 'date', required: true },
      { name: 'invoiceNumber', label: 'Invoice / Bill / Ticket Reference', type: 'text', required: false, placeholder: 'e.g. INV-2026-9901' },
      { name: 'disputedAmount', label: 'Disputed Financial Amount (if applicable)', type: 'text', required: false, placeholder: 'e.g. ₹ 4,500 / $ 50' },
      { name: 'facilityLocation', label: 'Branch / Facility Location', type: 'text', required: false, placeholder: 'e.g. Begumpet Branch, Zone 4' },
      { name: 'priorReferenceNumber', label: 'Prior Complaint / Service Reference #', type: 'text', required: false, placeholder: 'e.g. CPET-2026-10294' },
    ],
    schema: z.object({
      targetType: z.enum(['PRODUCT', 'SERVICE', 'ORGANIZATION', 'INSTITUTION', 'FACILITY']).default('PRODUCT'),
      targetName: z.string().min(1, 'Target name is required'),
      complaintType: z.string().min(1, 'Complaint type is required'),
      incidentDate: z.string().optional(),
      invoiceNumber: z.string().optional(),
      disputedAmount: z.string().optional(),
      facilityLocation: z.string().optional(),
      priorReferenceNumber: z.string().optional(),
    }),
    slaHours: {
      URGENT: 12,
      HIGH: 24,
      MEDIUM: 48,
      LOW: 72,
    },
    allowedTransitions: ['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_ORGANIZATION', 'RESOLVED', 'ESCALATED', 'CLOSED'],
  },

  BLOOD_REQUEST: {
    type: 'BLOOD_REQUEST',
    displayName: 'Emergency Blood Requirement',
    description: 'Urgent medical requirement for whole blood, plasma, or platelets with 5-level geographic discovery.',
    badge: 'Priority 6h SLA',
    categories: [
      {
        id: 'emergency-trauma',
        name: 'Emergency Trauma & Critical Care',
        subcategories: ['Accident / Hemorrhage', 'Emergency Surgery', 'ICU Critical Shock'],
      },
      {
        id: 'chronic-care',
        name: 'Scheduled & Chronic Care Support',
        subcategories: ['Thalassemia Transfusion', 'Dialysis Support', 'Chemotherapy Platelet Transfusion'],
      },
      {
        id: 'maternal-care',
        name: 'Maternal & Neonatal Emergency',
        subcategories: ['Postpartum Hemorrhage', 'High Risk Delivery'],
      },
    ],
    fieldDefinitions: [
      { name: 'bloodGroup', label: 'Required Blood Group', type: 'select', required: true, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      { name: 'unitsNeeded', label: 'Required Units', type: 'number', required: true, placeholder: '1' },
      { name: 'hospitalName', label: 'Hospital / Medical Facility Name', type: 'text', required: true, placeholder: 'e.g. Metro City Trauma Hospital' },
      { name: 'patientName', label: 'Patient Name (or Patient ID)', type: 'text', required: false, placeholder: 'e.g. R. Sharma' },
      { name: 'urgency', label: 'Urgency Level', type: 'select', required: true, options: ['CRITICAL_IMMEDIATE', 'WITHIN_24_HOURS', 'SCHEDULED_DATE'] },
      { name: 'requesterRelationship', label: 'Relationship to Patient', type: 'select', required: true, options: ['FAMILY', 'SELF', 'HOSPITAL_STAFF', 'ATTENDANT', 'SOCIAL_WORKER'] },
      { name: 'contactPhone', label: 'Attendant Verified Emergency Phone', type: 'phone', required: true, placeholder: '+91 9876543210' },
      { name: 'hospitalWard', label: 'Hospital Ward / Room # / Bed', type: 'text', required: false, placeholder: 'Emergency Ward 2B, Bed 12' },
      { name: 'doctorName', label: 'Treating Physician / Blood Bank Desk', type: 'text', required: false, placeholder: 'Dr. A. Verma' },
      { name: 'requiredByDate', label: 'Required By Date / Time', type: 'text', required: false, placeholder: 'e.g. Today before 6:00 PM' },
    ],
    schema: z.object({
      bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      unitsNeeded: z.coerce.number().min(1).max(20).default(1),
      hospitalName: z.string().min(2, 'Hospital name is required'),
      patientName: z.string().optional(),
      urgency: z.enum(['CRITICAL_IMMEDIATE', 'WITHIN_24_HOURS', 'SCHEDULED_DATE']).default('CRITICAL_IMMEDIATE'),
      requesterRelationship: z.enum(['FAMILY', 'SELF', 'HOSPITAL_STAFF', 'ATTENDANT', 'SOCIAL_WORKER']).default('FAMILY'),
      contactPhone: z.string().min(5, 'Contact phone is required for blood coordination'),
      hospitalWard: z.string().optional(),
      doctorName: z.string().optional(),
      requiredByDate: z.string().optional(),
    }),
    slaHours: {
      URGENT: 6,
      HIGH: 12,
      MEDIUM: 24,
      LOW: 48,
    },
    allowedTransitions: ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'],
  },

  GRIEVANCE: {
    type: 'GRIEVANCE',
    displayName: 'Civic & Municipal Grievance',
    description: 'Report civic issues including roads, potholes, street lights, sanitation, garbage, and public administration.',
    badge: 'Civic SLA',
    categories: [
      {
        id: 'civic-infrastructure',
        name: 'Roads & Municipal Infrastructure',
        subcategories: ['Potholes & Broken Roads', 'Damaged Footpath', 'Open Manhole', 'Streetlight Defect'],
      },
      {
        id: 'civic-sanitation',
        name: 'Sanitation & Public Health',
        subcategories: ['Garbage Overflow', 'Drainage Blockage', 'Stagnant Water / Mosquito Hazard'],
      },
    ],
    fieldDefinitions: [
      { name: 'civicWard', label: 'Municipality / Ward Number', type: 'text', required: true, placeholder: 'e.g. Ward 104, Serilingampally' },
      { name: 'grievanceType', label: 'Grievance Nature', type: 'select', required: true, options: ['Pothole Repair', 'Garbage Clearance', 'Drainage Overflow', 'Streetlight Repair', 'Water Supply Disruption'] },
      { name: 'landmark', label: 'Prominent Landmark', type: 'text', required: false, placeholder: 'Near Community Hall' },
    ],
    schema: z.object({
      civicWard: z.string().min(1, 'Ward information is required'),
      grievanceType: z.string().min(1, 'Grievance type is required'),
      landmark: z.string().optional(),
    }),
    slaHours: {
      URGENT: 12,
      HIGH: 24,
      MEDIUM: 48,
      LOW: 72,
    },
    allowedTransitions: ['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  },
};
