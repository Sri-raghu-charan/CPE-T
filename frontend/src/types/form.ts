export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'file'
  | 'rating'
  | 'location';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  order: number;
}

export interface DynamicForm {
  _id: string;
  organizationId?: string | null;
  organizationName: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  department?: string;
  isPublic: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  slaHours: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  fields: FormField[];
  submitButtonText?: string;
  successMessage?: string;
  submissionsCount?: number;
  publishedAt?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmissionPayload {
  formId: string;
  answers: Record<string, any>;
  citizenInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  location?: {
    coordinates?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface FormSubmissionResult {
  success: boolean;
  referenceNumber: string;
  caseId: string;
  formTitle: string;
  organizationName: string;
  status: string;
  message: string;
  case?: any;
}
