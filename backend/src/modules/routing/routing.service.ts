import { Types } from 'mongoose';
import {
  OrganizationModel,
  DestinationModel,
  DestinationType,
  IDestination,
} from '@cpet/database';
import { memoryStore, MemoryDestination } from '../../infrastructure/store.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface RouteEvaluationInput {
  organizationId?: string;
  organizationName?: string;
  rawOrgName?: string;
  intent?: string;
  productService?: string;
  category?: string;
  location?: {
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
  };
  preferredChannel?: DestinationType;
}

export interface RoutingDecision {
  organizationId: string;
  organizationName: string;
  departmentId: string;
  departmentName: string;
  destinationId: string;
  destinationType: DestinationType;
  destinationValue: string;
  routeMatchedReason: string;
  slaHours: number;
}

export class RoutingService {
  /**
   * Deterministically evaluates the correct organization, department, and destination.
   * AI may extract entities; this backend function strictly makes the routing decision.
   * Never permits invented or unverified destinations.
   */
  public async evaluateRoute(input: RouteEvaluationInput): Promise<RoutingDecision> {
    const isDb = memoryStore.isDbConnected();

    // Step 1: Deterministically resolve the target Organization
    const organization = await this.resolveOrganization(input, isDb);
    if (!organization || organization.active === false) {
      throw new ValidationError(
        `Cannot resolve verified organization${
          input.organizationId
            ? ` for ID '${input.organizationId}'`
            : input.rawOrgName || input.organizationName
            ? ` for '${input.rawOrgName || input.organizationName}'`
            : ''
        }.`
      );
    }

    const orgIdStr = organization._id.toString();

    // Step 2: Determine appropriate Department based on intent, product, and category
    const matchedDepartment = this.determineDepartment(organization, input);

    // Step 3: Fetch active, verified Destinations for this Organization
    const availableDestinations = await this.getVerifiedDestinations(orgIdStr, isDb);
    if (!availableDestinations || availableDestinations.length === 0) {
      throw new ValidationError(`No verified destination configured for organization '${organization.name}'. Contact CPET support.`);
    }

    // Step 4: Deterministically select the best destination
    // Priority:
    // a) Preferred channel matching department
    // b) Destination specifically assigned to matchedDepartment
    // c) Default INTERNAL_QUEUE -> EMAIL -> API -> OFFICIAL_PORTAL
    let selectedDest: IDestination | MemoryDestination | null = null;

    if (input.preferredChannel) {
      selectedDest = availableDestinations.find(
        (d) => d.type === input.preferredChannel && (!d.departmentId || d.departmentId === matchedDepartment.id)
      ) || null;
    }

    if (!selectedDest && matchedDepartment.id) {
      selectedDest = availableDestinations.find((d) => d.departmentId === matchedDepartment.id) || null;
    }

    if (!selectedDest) {
      // Prioritize internal CPET queue if available
      selectedDest =
        availableDestinations.find((d) => d.type === 'INTERNAL_QUEUE') ||
        availableDestinations.find((d) => d.type === 'EMAIL') ||
        availableDestinations.find((d) => d.type === 'API') ||
        availableDestinations[0] ||
        null;
    }

    if (!selectedDest) {
      throw new ValidationError(`No valid destination found for organization '${organization.name}'`);
    }

    // Strict validation: selected destination MUST have activeStatus true and verificationStatus 'VERIFIED'
    if (!selectedDest.activeStatus || selectedDest.verificationStatus !== 'VERIFIED') {
      throw new ValidationError(`Security violation: Destination '${selectedDest._id}' is unverified or inactive.`);
    }

    // SLA hours based on organization settings
    const defaultSla = organization.settings?.defaultSlaHours || 48;

    const routeMatchedReason = `Deterministically routed to '${matchedDepartment.name}' via ${selectedDest.type} (${selectedDest.value}) for ${input.productService || input.intent || 'General Case'}`;
    logger.info(`[RoutingEngine] Case routed: Org=${organization.name} Dept=${matchedDepartment.name} Channel=${selectedDest.type}`);

    return {
      organizationId: orgIdStr,
      organizationName: organization.name,
      departmentId: matchedDepartment.id,
      departmentName: matchedDepartment.name,
      destinationId: selectedDest._id.toString(),
      destinationType: selectedDest.type as DestinationType,
      destinationValue: selectedDest.value,
      routeMatchedReason,
      slaHours: defaultSla,
    };
  }

  /**
   * Resolves organization record from ID or fuzzy brand/alias mention.
   */
  private async resolveOrganization(
    input: RouteEvaluationInput,
    isDb: boolean
  ): Promise<any> {
    if (input.organizationId) {
      if (isDb) {
        return await OrganizationModel.findById(input.organizationId).lean();
      } else {
        return memoryStore.organizations.get(input.organizationId) || null;
      }
    }

    const mention = (input.rawOrgName || input.organizationName || '').trim().toLowerCase();
    if (!mention) {
      // Prioritize healthcare/blood partner for emergency blood requests
      if (input.intent === 'BLOOD_REQUEST' || input.category?.toLowerCase().includes('blood') || input.category?.toLowerCase().includes('healthcare')) {
        if (isDb) {
          const bloodOrg = await OrganizationModel.findOne({
            $or: [{ type: 'HEALTHCARE' }, { category: { $regex: 'blood|healthcare', $options: 'i' } }],
            status: 'VERIFIED',
            active: true,
          }).lean();
          if (bloodOrg) return bloodOrg;
        } else {
          const bloodOrg = Array.from(memoryStore.organizations.values()).find(
            (o) => (o.type === 'HEALTHCARE' || o.category.toLowerCase().includes('blood') || o.name.toLowerCase().includes('blood')) && o.status === 'VERIFIED' && o.active !== false
          );
          if (bloodOrg) return bloodOrg;
        }
      }

      // Fall back to default primary utility
      if (isDb) {
        return await OrganizationModel.findOne({ status: 'VERIFIED', active: true }).lean();
      } else {
        return Array.from(memoryStore.organizations.values()).find((o) => o.status === 'VERIFIED' && o.active !== false) || null;
      }
    }

    if (isDb) {
      // Look up by brandName, name, or aliases
      return await OrganizationModel.findOne({
        $or: [
          { name: { $regex: mention, $options: 'i' } },
          { brandName: { $regex: mention, $options: 'i' } },
          { aliases: mention },
        ],
        status: 'VERIFIED',
      }).lean();
    } else {
      return (
        Array.from(memoryStore.organizations.values()).find((o) => {
          const matchName = o.name.toLowerCase().includes(mention);
          const matchBrand = (o.brandName || '').toLowerCase().includes(mention);
          const matchAlias = (o.aliases || []).some((a) => a.toLowerCase() === mention);
          return (matchName || matchBrand || matchAlias) && o.status === 'VERIFIED';
        }) || null
      );
    }
  }

  /**
   * Evaluates department matching rules.
   */
  private determineDepartment(
    org: any,
    input: RouteEvaluationInput
  ): { id: string; name: string } {
    const depts = org.departments || [];
    if (depts.length === 0) {
      return { id: 'DEP-GEN', name: 'General Support Desk' };
    }

    const intent = (input.intent || '').toUpperCase();
    const product = (input.productService || '').toLowerCase();
    const category = (input.category || '').toLowerCase();

    // 1. Complaint / Billing dispute
    if (intent === 'COMPLAINT' || category.includes('billing') || product.includes('meter')) {
      const grievanceDept = depts.find(
        (d: any) =>
          d.name.toLowerCase().includes('grievance') ||
          d.name.toLowerCase().includes('billing') ||
          d.name.toLowerCase().includes('escalation')
      );
      if (grievanceDept) return { id: grievanceDept.id, name: grievanceDept.name };
    }

    // 2. Technical service / repair / AC
    if (
      intent === 'SERVICE_REQUEST' ||
      product.includes('ac') ||
      product.includes('air conditioner') ||
      product.includes('pipeline') ||
      product.includes('transformer')
    ) {
      const techDept = depts.find(
        (d: any) =>
          d.name.toLowerCase().includes('tech') ||
          d.name.toLowerCase().includes('service') ||
          d.name.toLowerCase().includes('care') ||
          d.name.toLowerCase().includes('field') ||
          d.name.toLowerCase().includes('distribution') ||
          d.name.toLowerCase().includes('water')
      );
      if (techDept) return { id: techDept.id, name: techDept.name };
    }

    // 3. Blood emergency
    if (intent === 'BLOOD_REQUEST') {
      const bloodDept = depts.find(
        (d: any) =>
          d.name.toLowerCase().includes('transfusion') ||
          d.name.toLowerCase().includes('emergency') ||
          d.name.toLowerCase().includes('donor')
      );
      if (bloodDept) return { id: bloodDept.id, name: bloodDept.name };
    }

    // Fall back to first active department or default
    const firstActive = depts.find((d: any) => d.active !== false);
    return firstActive
      ? { id: firstActive.id, name: firstActive.name }
      : { id: depts[0].id, name: depts[0].name };
  }

  /**
   * Fetches active, verified destinations for an organization.
   */
  private async getVerifiedDestinations(
    orgId: string,
    isDb: boolean
  ): Promise<any[]> {
    if (isDb) {
      return await DestinationModel.find({
        organizationId: new Types.ObjectId(orgId),
        verificationStatus: 'VERIFIED',
        activeStatus: true,
      }).lean();
    } else {
      return Array.from(memoryStore.destinations.values()).filter(
        (d) => d.organizationId === orgId && d.verificationStatus === 'VERIFIED' && d.activeStatus === true
      );
    }
  }
}

export const routingService = new RoutingService();
