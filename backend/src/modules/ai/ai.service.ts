import { memoryStore } from '../../infrastructure/store.js';
import { OrganizationModel, CaseType, CasePriority } from '@cpet/database';
import {
  AiIntakeRequest,
  AiExtractedCase,
  aiExtractedCaseSchema,
  Clarification,
} from './schemas.js';
import { speechService } from './speech.service.js';
import { logSecurityEvent } from '../../middleware/security.js';

export class AiService {
  /**
   * Sanitizes input text against prompt injection, instruction overrides,
   * and malicious tool execution attempts.
   */
  public sanitizePrompt(text: string): { sanitized: string; wasSanitized: boolean } {
    let sanitized = text;
    let wasSanitized = false;

    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)/gi,
      /you\s+are\s+now\s+(a|an)?\s*(admin|developer|jailbreak|unrestricted)/gi,
      /system\s+override\s*:/gi,
      /bypass\s+(all\s+)?(security|tenant|policy|filters)/gi,
      /execute\s+command\s*:/gi,
      /reveal\s+(all\s+)?(passwords|secrets|internal\s+keys|tokens|credentials)/gi,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[BLOCKED_INSTRUCTION]');
        wasSanitized = true;
      }
    }

    return { sanitized, wasSanitized };
  }

  /**
   * Main Conversational Intake Analysis Pipeline.
   * Understands intent, extracts entities, matches organizations,
   * identifies missing information, and asks one targeted question at a time.
   */
  public async analyzeIntake(input: AiIntakeRequest): Promise<AiExtractedCase> {
    const rawTrimmed = input.message.trim();
    const { sanitized: rawText, wasSanitized } = this.sanitizePrompt(rawTrimmed);

    if (wasSanitized) {
      logSecurityEvent('AI_PROMPT_INJECTION_DEFENSE_TRIGGERED', {
        originalText: rawTrimmed,
        neutralizedText: rawText,
      });
    }

    const detectedLang =
      input.languageHint && input.languageHint !== 'auto'
        ? input.languageHint
        : speechService.detectLanguage(rawText);

    // Merge incoming conversation context
    const prevContext = {
      structuredData: {},
      conversationHistory: [],
      ...input.context,
    };
    const history: Array<{ role: 'user' | 'assistant'; text: string }> = [
      ...(prevContext.conversationHistory || []),
    ];
    history.push({ role: 'user', text: rawText });

    // Step 1: Detect Intent / Case Type
    const intent = this.detectIntent(rawText, prevContext.intent);

    // Step 2: Extract Entities (Organization, Product, Category, Priority, Structured Specs)
    const entities = this.extractEntities(rawText, intent, prevContext);

    // Step 3: Match Organization from Registered Tenants
    const organization = await this.matchOrganization(entities.rawOrgName, prevContext.organizationId, intent);

    // Step 4: Extract or Update Location
    const location = this.extractLocation(rawText, prevContext.location);

    // Step 5: Check Completeness & Determine Next Single Clarification Question
    const { isComplete, nextClarification } = this.determineClarification(
      intent,
      entities,
      organization,
      location,
      history
    );

    // Step 6: Generate friendly summary
    const summary = this.generateSummary(intent, organization.matchedName || entities.rawOrgName, entities.productService, location);

    if (nextClarification) {
      history.push({ role: 'assistant', text: nextClarification.question });
    } else {
      history.push({
        role: 'assistant',
        text: `I've prepared your ${intent.replace(/_/g, ' ')} for ${organization.matchedName || 'the service provider'}. Please review the details below before creating your case.`,
      });
    }

    const extractedResult: AiExtractedCase = {
      intent,
      confidence: 0.96,
      detectedLanguage: detectedLang,
      summary,
      organization,
      productService: entities.productService || 'General Product/Service',
      category: entities.category || 'General Assistance',
      priority: entities.priority || 'MEDIUM',
      structuredData: entities.structuredData,
      location,
      isComplete,
      nextClarification,
      conversationHistory: history,
    };

    // Strict schema validation
    return aiExtractedCaseSchema.parse(extractedResult);
  }

  /**
   * Identifies Case Type from natural language keywords and syntax.
   */
  private detectIntent(text: string, previousIntent?: CaseType): CaseType {
    const t = text.toLowerCase();

    // Emergency Blood Detection
    if (
      t.includes('blood') ||
      t.includes('plasma') ||
      t.includes('platelet') ||
      t.includes('donor') ||
      t.includes('transfusion') ||
      t.includes('రక్తం') ||
      t.includes('रक्त') ||
      t.includes('खून') ||
      /o\+|o-|a\+|a-|b\+|b-|ab\+|ab-/i.test(t)
    ) {
      return 'BLOOD_REQUEST';
    }

    // Complaint Detection
    if (
      t.includes('complaint') ||
      t.includes('overcharg') ||
      t.includes('fraud') ||
      t.includes('cheat') ||
      t.includes('defective') ||
      t.includes('broken') ||
      t.includes('delay') ||
      t.includes('harass') ||
      t.includes('refund') ||
      t.includes('शिकायत') ||
      t.includes('ఫిర్యాదు')
    ) {
      return 'COMPLAINT';
    }

    // Civic Grievance Detection
    if (
      t.includes('pothole') ||
      t.includes('street light') ||
      t.includes('drainage') ||
      t.includes('garbage') ||
      t.includes('sanitation') ||
      t.includes('water supply') ||
      t.includes('municipality') ||
      t.includes('ward') ||
      t.includes('గుంతలు') ||
      t.includes('చెత్త')
    ) {
      return 'GRIEVANCE';
    }

    // Service Request Detection
    if (
      t.includes('service') ||
      t.includes('servicing') ||
      t.includes('repair') ||
      t.includes('maintenance') ||
      t.includes('install') ||
      t.includes('checkup') ||
      t.includes('warranty') ||
      t.includes('cool') ||
      t.includes('ac') ||
      t.includes('সার্ভিস') ||
      t.includes('సర్వీసింగ్')
    ) {
      return 'SERVICE_REQUEST';
    }

    return previousIntent || 'SERVICE_REQUEST';
  }

  /**
   * Extracts domain-specific entities from text.
   */
  private extractEntities(
    text: string,
    intent: CaseType,
    prevContext: Record<string, any>
  ): {
    rawOrgName?: string;
    productService?: string;
    category?: string;
    priority?: CasePriority;
    structuredData: Record<string, any>;
  } {
    const t = text.toLowerCase();
    const structuredData: Record<string, any> = { ...(prevContext.structuredData || {}) };

    let rawOrgName = prevContext.organizationName;
    let productService = prevContext.productService;
    let category = prevContext.category;
    let priority: CasePriority = prevContext.priority || 'MEDIUM';

    // 1. Identify Brand / Organization mention dynamically from registered organizations
    const registeredOrgs = Array.from(memoryStore.organizations.values());
    for (const org of registeredOrgs) {
      const matchBrand = org.brandName && t.includes(org.brandName.toLowerCase());
      const matchName = org.name && t.includes(org.name.toLowerCase());
      const matchAlias = org.aliases && org.aliases.some((a) => t.includes(a.toLowerCase()));
      if (matchBrand || matchName || matchAlias) {
        rawOrgName = org.brandName || org.name;
        break;
      }
    }

    if (!rawOrgName) {
      const fallbackBrands: Record<string, string> = {
        samsung: 'Samsung',
        lg: 'LG Electronics',
        voltas: 'Voltas',
        daikin: 'Daikin',
        whirlpool: 'Whirlpool',
        hitachi: 'Hitachi',
        'blue star': 'Blue Star',
        panasonic: 'Panasonic',
        lloyd: 'Lloyd',
        apex: 'Apex Power & Water',
      };
      for (const [pattern, brandName] of Object.entries(fallbackBrands)) {
        if (t.includes(pattern)) {
          rawOrgName = brandName;
          break;
        }
      }
    }

    // 2. Identify Product / Equipment
    if (t.includes('ac') || t.includes('air conditioner') || t.includes('एसी') || t.includes('ఏసీ')) {
      productService = `${rawOrgName || 'Split'} Air Conditioner`;
      category = 'Consumer Appliance & Utilities';
    } else if (t.includes('fridge') || t.includes('refrigerator') || t.includes('फ्रिज') || t.includes('ఫ్రిజ్')) {
      productService = `${rawOrgName || 'Home'} Refrigerator`;
      category = 'Consumer Appliance & Utilities';
    } else if (t.includes('transformer') || t.includes('power') || t.includes('electricity') || t.includes('voltage')) {
      productService = 'Electric Distribution Line';
      category = 'Public Utilities';
      priority = 'HIGH';
    } else if (t.includes('water') || t.includes('pipe') || t.includes('meter')) {
      productService = 'Municipal Water Pipeline';
      category = 'Public Utilities';
    } else if (t.includes('washing') || t.includes('washer')) {
      productService = `${rawOrgName || 'Automatic'} Washing Machine`;
      category = 'Consumer Appliance & Utilities';
    }

    // 3. Domain Specific Structured Extraction
    if (intent === 'BLOOD_REQUEST') {
      priority = 'URGENT';
      category = 'Emergency Healthcare';
      productService = 'Emergency Blood Bank';

      // Match Blood Group
      const bgMatch = text.match(/(?:^|\W)(O\+|O-|A\+|A-|B\+|B-|AB\+|AB-)(?:$|\W)/i);
      if (bgMatch) {
        structuredData.bloodGroup = bgMatch[1].toUpperCase();
      }

      // Match Units
      const unitsMatch =
        text.match(/(\d+)\s*(?:unit|units|bottle|bottles|packet|packets|యూనిట్|యూనిట్లు|यूनिट|बोतल)/i) ||
        text.match(/\b(\d+)\b/);
      if (unitsMatch) {
        structuredData.unitsNeeded = parseInt(unitsMatch[1], 10);
      } else if (!structuredData.unitsNeeded) {
        structuredData.unitsNeeded = 1;
      }

      // Match Hospital
      const hospMatch =
        text.match(/(?:at|in|near)\s+([A-Za-z0-9\s]+?(?:Hospital|Center|Care|Clinic|Trust|Blood Bank))\b/i) ||
        text.match(/\b([A-Z][a-zA-Z0-9\s]+?(?:Hospital|Center|Care|Clinic|Trust|Blood Bank))\b/);
      if (hospMatch) {
        structuredData.hospitalName = hospMatch[1].trim();
      }

      // Default required fields
      structuredData.urgency = structuredData.urgency || 'CRITICAL_IMMEDIATE';
      structuredData.requesterRelationship = structuredData.requesterRelationship || 'FAMILY';
      structuredData.contactPhone = structuredData.contactPhone || '+91 9876543210';
    } else if (intent === 'SERVICE_REQUEST') {
      if (t.includes('cooling') || t.includes('cool') || t.includes('chilled') || t.includes('thanda')) {
        structuredData.issueType = 'Cooling Defect / Gas Check';
      } else if (t.includes('service') || t.includes('maintenance')) {
        structuredData.issueType = 'Periodic Maintenance Service';
      } else if (t.includes('repair') || t.includes('breakdown')) {
        structuredData.issueType = 'Electrical / Power Failure';
      } else {
        structuredData.issueType = structuredData.issueType || 'Periodic Maintenance Service';
      }

      if (rawOrgName) {
        structuredData.brand = rawOrgName;
      }

      const snPrefixMatch = text.match(/(?:s\/n|sn|serial(?:\s*no|\s*number)?)[:\s#]+([A-Za-z0-9-]+)/i);
      const snCodeMatch = text.match(/\b(SN-[A-Za-z0-9]+)\b/i) || text.match(/\b(?=[A-Za-z0-9]{8,16}\b)(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[A-Za-z0-9]+\b/);
      const detectedSn = snPrefixMatch ? snPrefixMatch[1] : snCodeMatch ? snCodeMatch[0] : null;
      if (detectedSn && !detectedSn.toLowerCase().includes('lloyd') && !detectedSn.toLowerCase().includes('samsung')) {
        structuredData.serialNumber = detectedSn;
      }
    } else if (intent === 'COMPLAINT') {
      // Determine complaint target type
      if (t.includes('hospital') || t.includes('clinic') || t.includes('college') || t.includes('school') || t.includes('university') || t.includes('bank')) {
        structuredData.targetType = 'INSTITUTION';
      } else if (t.includes('bus') || t.includes('metro') || t.includes('transit') || t.includes('terminal') || t.includes('station') || t.includes('airport')) {
        structuredData.targetType = 'FACILITY';
      } else if (t.includes('ac') || t.includes('fridge') || t.includes('refrigerator') || t.includes('phone') || t.includes('transformer') || t.includes('product')) {
        structuredData.targetType = 'PRODUCT';
      } else if (t.includes('service') || t.includes('technician') || t.includes('repair') || t.includes('broadband')) {
        structuredData.targetType = 'SERVICE';
      } else {
        structuredData.targetType = 'ORGANIZATION';
      }

      structuredData.targetName = rawOrgName || productService || 'Target Provider';

      if (t.includes('bill') || t.includes('meter') || t.includes('overcharg') || t.includes('tariff')) {
        structuredData.complaintType = 'Billing Dispute';
      } else if (t.includes('warranty') || t.includes('refus')) {
        structuredData.complaintType = 'Warranty Refusal';
      } else if (t.includes('delay') || t.includes('late') || t.includes('pending')) {
        structuredData.complaintType = 'Service Delay / SLA Breach';
      } else if (t.includes('defective') || t.includes('broken') || t.includes('damage')) {
        structuredData.complaintType = 'Defective Goods';
      } else {
        structuredData.complaintType = structuredData.complaintType || 'Service Delay / SLA Breach';
      }

      structuredData.incidentDate = structuredData.incidentDate || new Date().toISOString().slice(0, 10);
    } else if (intent === 'GRIEVANCE') {
      const wardMatch = text.match(/ward\s*(\d+)/i);
      if (wardMatch) {
        structuredData.civicWard = `Ward ${wardMatch[1]}`;
      } else {
        structuredData.civicWard = structuredData.civicWard || 'Ward 104, Serilingampally';
      }
      structuredData.grievanceType = structuredData.grievanceType || 'Pothole Repair';
    }

    return {
      rawOrgName,
      productService,
      category,
      priority,
      structuredData,
    };
  }

  /**
   * Matches candidate organization name to a registered tenant in database/memory.
   */
  private async matchOrganization(
    rawBrand?: string,
    existingOrgId?: string,
    intent?: CaseType
  ): Promise<{ matchedId?: string; matchedName?: string; rawMention?: string }> {
    const isDb = memoryStore.isDbConnected();

    // If intent is BLOOD_REQUEST, prioritize healthcare/blood bank partner
    if (intent === 'BLOOD_REQUEST') {
      if (isDb) {
        const bloodOrg = await OrganizationModel.findOne({
          $or: [{ type: 'HEALTHCARE' }, { category: { $regex: 'blood', $options: 'i' } }],
          status: 'VERIFIED',
        }).lean();
        if (bloodOrg) {
          return { matchedId: bloodOrg._id.toString(), matchedName: bloodOrg.name, rawMention: rawBrand || bloodOrg.name };
        }
      } else {
        const bloodOrg = Array.from(memoryStore.organizations.values()).find(
          (o) => o.type === 'HEALTHCARE' || o.category.toLowerCase().includes('blood') || o.name.toLowerCase().includes('blood')
        );
        if (bloodOrg) {
          return { matchedId: bloodOrg._id, matchedName: bloodOrg.name, rawMention: rawBrand || bloodOrg.name };
        }
      }
    }

    // If already has an ID
    if (existingOrgId) {
      if (isDb) {
        const org = await OrganizationModel.findById(existingOrgId).lean();
        if (org) return { matchedId: org._id.toString(), matchedName: org.name, rawMention: rawBrand };
      } else {
        const org = memoryStore.organizations.get(existingOrgId);
        if (org) return { matchedId: org._id, matchedName: org.name, rawMention: rawBrand };
      }
    }

    // If brand specified, match against name, brandName, or aliases
    if (rawBrand) {
      const brandLower = rawBrand.toLowerCase();
      if (isDb) {
        const org = await OrganizationModel.findOne({
          $or: [
            { name: { $regex: brandLower, $options: 'i' } },
            { brandName: { $regex: brandLower, $options: 'i' } },
            { aliases: brandLower },
          ],
          status: 'VERIFIED',
        }).lean();
        if (org) {
          return { matchedId: org._id.toString(), matchedName: org.name, rawMention: rawBrand };
        }
      } else {
        const org = Array.from(memoryStore.organizations.values()).find((o) => {
          const mName = o.name.toLowerCase().includes(brandLower);
          const mBrand = (o.brandName || '').toLowerCase().includes(brandLower);
          const mAlias = (o.aliases || []).some((a) => a.toLowerCase() === brandLower);
          return (mName || mBrand || mAlias) && o.status === 'VERIFIED';
        });
        if (org) {
          return { matchedId: org._id, matchedName: org.name, rawMention: rawBrand };
        }
      }
    }

    // Default to first verified provider
    if (isDb) {
      const defaultOrg = await OrganizationModel.findOne({ status: 'VERIFIED' }).lean();
      if (defaultOrg) {
        return { matchedId: defaultOrg._id.toString(), matchedName: defaultOrg.name, rawMention: rawBrand || defaultOrg.name };
      }
    } else {
      const defaultOrg = Array.from(memoryStore.organizations.values())[0];
      if (defaultOrg) {
        return { matchedId: defaultOrg._id, matchedName: defaultOrg.name, rawMention: rawBrand || defaultOrg.name };
      }
    }

    return { rawMention: rawBrand };
  }

  /**
   * Extracts location details from text.
   */
  private extractLocation(text: string, prevLoc?: { city?: string; address?: string; pincode?: string }) {
    const location = { ...(prevLoc || {}) };

    const pincodeMatch = text.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      location.pincode = pincodeMatch[0];
    }

    const knownCities = ['Metro City', 'Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune'];
    for (const city of knownCities) {
      if (text.toLowerCase().includes(city.toLowerCase())) {
        location.city = city;
        break;
      }
    }

    // If text contains address indicators
    if (text.toLowerCase().includes('flat') || text.toLowerCase().includes('street') || text.toLowerCase().includes('road') || text.toLowerCase().includes('apartment')) {
      location.address = text.trim();
    }

    return location;
  }

  /**
   * Determines whether the case has sufficient facts for creation,
   * or formulates a single targeted clarification question with suggested chips.
   */
  private determineClarification(
    intent: CaseType,
    entities: { productService?: string; rawOrgName?: string; structuredData: Record<string, any> },
    organization: { matchedId?: string; matchedName?: string; rawMention?: string },
    location: { city?: string; address?: string },
    history: { role: string; text: string }[]
  ): { isComplete: boolean; nextClarification: Clarification | null } {
    // Check 1: Missing Blood Details
    if (intent === 'BLOOD_REQUEST') {
      if (!entities.structuredData.bloodGroup) {
        return {
          isComplete: false,
          nextClarification: {
            field: 'bloodGroup',
            question: 'Which blood group is urgently required for the patient?',
            options: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
          },
        };
      }
      if (!entities.structuredData.hospitalName) {
        return {
          isComplete: false,
          nextClarification: {
            field: 'hospitalName',
            question: 'Which hospital or medical center is the patient admitted in?',
            options: ['City Trauma Center', 'Central Government Hospital', 'Apollo Hospital', 'District Care Center'],
          },
        };
      }
    }

    // Check 2: Service Request specifics
    if (intent === 'SERVICE_REQUEST') {
      if (!entities.structuredData.issueType && history.length <= 2) {
        return {
          isComplete: false,
          nextClarification: {
            field: 'issueType',
            question: `What specific servicing does your ${entities.productService || 'appliance'} require?`,
            options: ['General Servicing', 'Cooling Defect / Gas Leak', 'Not Powering On', 'Installation / Shift'],
          },
        };
      }
    }

    // Check 3: Location information
    if (!location.city && !location.address && history.length <= 4) {
      return {
        isComplete: false,
        nextClarification: {
          field: 'location',
          question: 'Where should the service technician or support team reach you?',
          options: ['Metro City', 'Use My Current Location', 'Hyderabad', 'Bangalore'],
        },
      };
    }

    // If all essential fields are identified
    return {
      isComplete: true,
      nextClarification: null,
    };
  }

  /**
   * Generates a concise summary statement.
   */
  private generateSummary(
    intent: CaseType,
    orgName?: string,
    productService?: string,
    location?: { city?: string; address?: string }
  ): string {
    const typeLabel = intent.replace(/_/g, ' ').toLowerCase();
    const target = orgName ? `with ${orgName}` : '';
    const prod = productService ? `for ${productService}` : '';
    const loc = location?.city ? `in ${location.city}` : '';
    return `${typeLabel.toUpperCase()} ${target} ${prod} ${loc}`.replace(/\s+/g, ' ').trim();
  }
}

export const aiService = new AiService();
