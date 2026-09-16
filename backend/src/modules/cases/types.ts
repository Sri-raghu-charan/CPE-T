import { z } from 'zod';
import { CaseType, CaseStatus, CasePriority } from '@cpet/database';

export const CASE_TYPES: [CaseType, ...CaseType[]] = [
  'SERVICE_REQUEST',
  'COMPLAINT',
  'GRIEVANCE',
  'BLOOD_REQUEST',
  'SUPPORT_REQUEST',
  'FEEDBACK',
];

export const CASE_STATUSES: [CaseStatus, ...CaseStatus[]] = [
  'DRAFT',
  'READY_FOR_REVIEW',
  'CONFIRMED',
  'SUBMITTED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'WAITING_FOR_ORGANIZATION',
  'RESOLVED',
  'CLOSED',
  'ESCALATED',
  'REOPENED',
  'FAILED',
  'CANCELLED',
];

export const CASE_PRIORITIES: [CasePriority, ...CasePriority[]] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export const createCaseSchema = z.object({
  type: z.string().min(2),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(4000),
  category: z.string().min(2).max(100),
  subcategory: z.string().optional(),
  productService: z.string().optional(),
  organizationId: z.string().optional(),
  rawOrgName: z.string().optional(),
  organizationName: z.string().optional(),
  priority: z.enum(CASE_PRIORITIES).default('MEDIUM'),
  structuredData: z.record(z.any()).optional().default({}),
  location: z
    .object({
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        fileType: z.string(),
        size: z.number(),
      })
    )
    .optional()
    .default([]),
});

export const transitionCaseSchema = z.object({
  targetStatus: z.enum(CASE_STATUSES),
  message: z.string().min(2).max(2000),
  isInternal: z.boolean().optional().default(false),
  expectedVersion: z.number().int().positive().optional(),
  resolution: z
    .object({
      summary: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const assignAgentSchema = z.object({
  agentId: z.string().min(1),
  notes: z.string().optional(),
});

export const addMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  isInternal: z.boolean().optional().default(false),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        fileType: z.string(),
        size: z.number(),
      })
    )
    .optional()
    .default([]),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type TransitionCaseInput = z.infer<typeof transitionCaseSchema>;
export type AssignAgentInput = z.infer<typeof assignAgentSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
