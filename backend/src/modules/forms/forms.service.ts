import { Types } from 'mongoose';
import {
  FormModel,
  FormSubmissionModel,
  OrganizationModel,
} from '@cpet/database';
import { memoryStore } from '../../infrastructure/store.js';
import { caseService } from '../cases/case.service.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface FormQueryParams {
  organizationId?: string;
  isPublic?: boolean;
  status?: string;
  category?: string;
  search?: string;
  type?: 'public' | 'organization' | 'all';
}

export interface FormSubmissionInput {
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

export class FormsService {
  /**
   * Generates a URL-safe slug from a form title.
   */
  public generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${suffix}`;
  }

  /**
   * List forms with optional filtering.
   */
  public async getForms(params?: FormQueryParams): Promise<any[]> {
    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      const query: any = {};
      if (params?.organizationId) {
        query.organizationId = new Types.ObjectId(params.organizationId);
      }
      if (params?.isPublic !== undefined) {
        query.isPublic = params.isPublic;
      }
      if (params?.status) {
        query.status = params.status.toUpperCase();
      }
      if (params?.category) {
        query.category = params.category;
      }
      if (params?.search) {
        query.$or = [
          { title: { $regex: params.search, $options: 'i' } },
          { description: { $regex: params.search, $options: 'i' } },
        ];
      }

      return FormModel.find(query).sort({ createdAt: -1 }).lean();
    } else {
      let forms = Array.from(memoryStore.forms.values());

      if (params?.organizationId) {
        forms = forms.filter(
          (f) => f.organizationId && f.organizationId.toString() === params.organizationId!.toString()
        );
      }
      if (params?.isPublic !== undefined) {
        forms = forms.filter((f) => Boolean(f.isPublic) === params.isPublic);
      }
      if (params?.status) {
        forms = forms.filter((f) => f.status === params.status!.toUpperCase());
      }
      if (params?.category) {
        forms = forms.filter((f) => f.category.toLowerCase() === params.category!.toLowerCase());
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        forms = forms.filter(
          (f) => f.title.toLowerCase().includes(s) || f.description.toLowerCase().includes(s)
        );
      }

      return forms;
    }
  }

  /**
   * Retrieves public published forms.
   */
  public async getPublicForms(params?: { category?: string; search?: string; type?: string }): Promise<any[]> {
    return this.getForms({
      isPublic: true,
      status: 'PUBLISHED',
      category: params?.category,
      search: params?.search,
      type: 'public',
    });
  }

  /**
   * Retrieves a form by its ID or unique slug.
   */
  public async getFormByIdOrSlug(idOrSlug: string): Promise<any> {
    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      let form: any = null;
      if (Types.ObjectId.isValid(idOrSlug)) {
        form = await FormModel.findById(idOrSlug).lean();
      }
      if (!form) {
        form = await FormModel.findOne({ slug: idOrSlug.toLowerCase() }).lean();
      }
      if (!form) {
        throw new NotFoundError(`Form '${idOrSlug}' not found or unavailable`);
      }
      return form;
    } else {
      let form = memoryStore.forms.get(idOrSlug);
      if (!form) {
        form = Array.from(memoryStore.forms.values()).find(
          (f) => f.slug === idOrSlug.toLowerCase() || f._id === idOrSlug
        );
      }
      if (!form) {
        throw new NotFoundError(`Form '${idOrSlug}' not found or unavailable`);
      }
      return form;
    }
  }

  /**
   * Creates a new Dynamic Form.
   */
  public async createForm(
    data: any,
    user: { userId: string; name?: string; role: string; organizationId?: string | null }
  ): Promise<any> {
    const isDb = memoryStore.isDbConnected();
    const slug = data.slug ? data.slug.toLowerCase().trim() : this.generateSlug(data.title || 'custom-form');

    let orgName = data.organizationName;
    const orgId = user.organizationId || data.organizationId;

    if (!orgName && orgId) {
      if (isDb) {
        const org = await OrganizationModel.findById(orgId).lean();
        if (org) orgName = org.name;
      } else {
        const org = memoryStore.organizations.get(orgId);
        if (org) orgName = org.name;
      }
    }
    orgName = orgName || 'Universal Service Organization';

    const formPayload = {
      title: data.title,
      slug,
      description: data.description,
      category: data.category || 'General',
      department: data.department || '',
      organizationId: orgId ? (isDb ? new Types.ObjectId(orgId) : orgId) : null,
      organizationName: orgName,
      isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : true,
      status: data.status || 'PUBLISHED',
      slaHours: Number(data.slaHours) || 48,
      priority: data.priority || 'MEDIUM',
      fields: data.fields || [],
      submitButtonText: data.submitButtonText || 'Submit Request',
      successMessage: data.successMessage || 'Your submission has been recorded successfully.',
      submissionsCount: 0,
      publishedAt: new Date(),
      createdById: user.userId ? (isDb ? new Types.ObjectId(user.userId) : user.userId) : null,
      createdByName: user.name || 'Staff Member',
    };

    if (isDb) {
      const created = await FormModel.create(formPayload);
      return created.toObject();
    } else {
      const formId = crypto.randomUUID();
      const stored = {
        _id: formId,
        ...formPayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.forms.set(formId, stored);
      return stored;
    }
  }

  /**
   * Updates an existing Dynamic Form.
   */
  public async updateForm(
    id: string,
    data: any,
    user: { userId: string; role: string; organizationId?: string | null }
  ): Promise<any> {
    const existing = await this.getFormByIdOrSlug(id);
    const isPlatformAdmin = user.role === 'SUPER_ADMIN' || user.role === 'CPET_ADMIN';

    if (!isPlatformAdmin && user.organizationId) {
      const existingOrgId = existing.organizationId?.toString();
      if (existingOrgId && existingOrgId !== user.organizationId.toString()) {
        throw new ForbiddenError('Tenant violation: You cannot edit forms belonging to other organizations');
      }
    }

    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      const updated = await FormModel.findByIdAndUpdate(
        existing._id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      return updated;
    } else {
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      memoryStore.forms.set(existing._id, updated);
      return updated;
    }
  }

  /**
   * Deletes / archives a Dynamic Form.
   */
  public async deleteForm(
    id: string,
    user: { userId: string; role: string; organizationId?: string | null }
  ): Promise<void> {
    const existing = await this.getFormByIdOrSlug(id);
    const isPlatformAdmin = user.role === 'SUPER_ADMIN' || user.role === 'CPET_ADMIN';

    if (!isPlatformAdmin && user.organizationId) {
      const existingOrgId = existing.organizationId?.toString();
      if (existingOrgId && existingOrgId !== user.organizationId.toString()) {
        throw new ForbiddenError('Tenant violation: You cannot delete forms belonging to other organizations');
      }
    }

    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      await FormModel.findByIdAndDelete(existing._id);
    } else {
      memoryStore.forms.delete(existing._id);
    }
  }

  /**
   * Submits a form: creates a Case, increments submissions count, and stores submission record.
   */
  public async submitForm(
    idOrSlug: string,
    payload: FormSubmissionInput,
    user?: { userId?: string; name?: string; email?: string; role?: string }
  ): Promise<any> {
    const form = await this.getFormByIdOrSlug(idOrSlug);

    const isDb = memoryStore.isDbConnected();

    // 1. Determine Case Type from category or department
    let caseType = 'SERVICE_REQUEST';
    const catLower = (form.category || '').toLowerCase();
    if (catLower.includes('complaint') || catLower.includes('grievance') || catLower.includes('billing')) {
      caseType = 'COMPLAINT';
    }

    // 2. Prepare description from answers
    const answersSummary = Object.entries(payload.answers || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const citizenName = payload.citizenInfo?.name || user?.name || 'Citizen';
    const citizenEmail = payload.citizenInfo?.email || user?.email || 'citizen@cpet.org';
    const citizenPhone = payload.citizenInfo?.phone || '';

    // 3. Create Case in system through CaseService
    const createdCase = await caseService.createCase(
      {
        type: caseType as any,
        title: `${form.title} — Request from ${citizenName}`,
        description: answersSummary || `Submission received via online dynamic form: ${form.title}`,
        category: form.category || 'Universal Intake',
        productService: form.department || form.title,
        organizationId: form.organizationId ? form.organizationId.toString() : undefined,
        rawOrgName: form.organizationName,
        organizationName: form.organizationName,
        priority: form.priority || 'MEDIUM',
        structuredData: {
          formId: form._id.toString(),
          formTitle: form.title,
          submitterPhone: citizenPhone || undefined,
          ...payload.answers,
        },
        location: payload.location,
        attachments: (payload.attachments || []).map((a) => ({
          name: a.name,
          url: a.url,
          fileType: a.type || 'application/octet-stream',
          size: a.size || 1024,
        })),
      },
      {
        _id: user?.userId || '66d000000000000000000099',
        name: citizenName,
        email: citizenEmail,
        role: (user?.role as any) || 'CITIZEN',
      }
    );

    const referenceNumber = createdCase.referenceNumber;

    // 4. Record FormSubmission
    const submissionRecord = {
      formId: form._id,
      caseId: createdCase._id,
      referenceNumber,
      answers: payload.answers,
      citizenInfo: payload.citizenInfo,
      attachments: payload.attachments,
      location: payload.location,
      submittedBy: user?.userId,
      createdAt: new Date(),
    };

    if (isDb) {
      await FormSubmissionModel.create(submissionRecord);
      await FormModel.findByIdAndUpdate(form._id, { $inc: { submissionsCount: 1 } });
    } else {
      const subId = crypto.randomUUID();
      memoryStore.formSubmissions.set(subId, { _id: subId, ...submissionRecord });
      form.submissionsCount = (form.submissionsCount || 0) + 1;
      memoryStore.forms.set(form._id, form);
    }

    logger.info(`[FormsService] Form '${form.title}' submitted. Generated Case Ref: ${referenceNumber}`);

    return {
      success: true,
      referenceNumber,
      caseId: createdCase._id.toString(),
      formTitle: form.title,
      organizationName: form.organizationName,
      status: 'SUBMITTED',
      message: form.successMessage || 'Form submitted successfully.',
      case: createdCase,
    };
  }

  /**
   * Retrieves submissions for a form with tenant authorization.
   */
  public async getFormSubmissions(
    formId: string,
    user: { userId: string; role: string; organizationId?: string | null }
  ): Promise<any[]> {
    const form = await this.getFormByIdOrSlug(formId);
    const isPlatformAdmin = user.role === 'SUPER_ADMIN' || user.role === 'CPET_ADMIN';

    if (!isPlatformAdmin && user.organizationId) {
      const formOrgId = form.organizationId?.toString();
      if (formOrgId && formOrgId !== user.organizationId.toString()) {
        throw new ForbiddenError('Tenant violation: Access to submissions of other organizations is prohibited');
      }
    }

    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      return FormSubmissionModel.find({ formId: form._id }).sort({ createdAt: -1 }).lean();
    } else {
      return Array.from(memoryStore.formSubmissions.values()).filter(
        (s) => s.formId && s.formId.toString() === form._id.toString()
      );
    }
  }
}

export const formsService = new FormsService();
