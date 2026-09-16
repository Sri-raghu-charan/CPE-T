import { CaseType, CasePriority } from '@cpet/database';
import { domainConfigs, DomainConfig } from './domain.config.js';
import { ValidationError } from '../../utils/errors.js';

export class DomainService {
  /**
   * Retrieves configuration for a given domain/case type.
   */
  public getDomainConfig(type: CaseType): DomainConfig | null {
    return domainConfigs[type] || null;
  }

  /**
   * Lists all registered domain configurations with field definitions and category lists.
   */
  public getAllDomainConfigs(): DomainConfig[] {
    return Object.values(domainConfigs);
  }

  /**
   * Validates structuredData against the domain's schema.
   * Throws ValidationError if invalid.
   */
  public validateStructuredData(type: CaseType, structuredData: Record<string, any> = {}): Record<string, any> {
    const config = this.getDomainConfig(type);
    if (!config) {
      return structuredData; // Dynamic / unstructured case
    }

    try {
      return config.schema.parse(structuredData);
    } catch (err: any) {
      const issueMsg = err.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || err.message;
      throw new ValidationError(`Domain validation error for ${type}: ${issueMsg}`);
    }
  }

  /**
   * Calculates SLA hours for a specific domain and priority.
   */
  public calculateDomainSlaHours(type: CaseType, priority: CasePriority, defaultOrgHours: number = 48): number {
    const config = this.getDomainConfig(type);
    if (!config) {
      switch (priority) {
        case 'URGENT': return Math.max(6, Math.floor(defaultOrgHours / 4));
        case 'HIGH': return Math.max(12, Math.floor(defaultOrgHours / 2));
        case 'MEDIUM': return defaultOrgHours;
        case 'LOW': return Math.floor(defaultOrgHours * 1.5);
      }
    }

    return config.slaHours[priority] || config.slaHours.MEDIUM;
  }
}

export const domainService = new DomainService();
