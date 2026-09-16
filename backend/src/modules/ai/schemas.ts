import { z } from 'zod';
import { CASE_TYPES, CASE_PRIORITIES } from '../cases/types.js';

export const aiIntakeRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z
    .object({
      intent: z.enum(CASE_TYPES).optional(),
      organizationId: z.string().optional(),
      organizationName: z.string().optional(),
      productService: z.string().optional(),
      category: z.string().optional(),
      priority: z.enum(CASE_PRIORITIES).optional(),
      structuredData: z.record(z.any()).optional().default({}),
      location: z
        .object({
          city: z.string().optional(),
          address: z.string().optional(),
          pincode: z.string().optional(),
        })
        .optional(),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            text: z.string(),
          })
        )
        .optional()
        .default([]),
    })
    .optional(),
  languageHint: z.enum(['en', 'hi', 'te', 'auto']).optional().default('auto'),
});

export const clarificationSchema = z.object({
  field: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
});

export const aiExtractedCaseSchema = z.object({
  intent: z.enum(CASE_TYPES),
  confidence: z.number().min(0).max(1),
  detectedLanguage: z.string(),
  summary: z.string(),
  organization: z.object({
    matchedId: z.string().optional(),
    matchedName: z.string().optional(),
    rawMention: z.string().optional(),
  }),
  productService: z.string(),
  category: z.string(),
  priority: z.enum(CASE_PRIORITIES),
  structuredData: z.record(z.any()),
  location: z.object({
    city: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
  }),
  isComplete: z.boolean(),
  nextClarification: clarificationSchema.nullable(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string(),
    })
  ),
});

export const voiceTranscribeRequestSchema = z.object({
  audioBase64: z.string().min(10),
  mimeType: z.string().default('audio/webm'),
  language: z.enum(['en', 'hi', 'te', 'auto']).default('auto'),
});

export type AiIntakeRequest = z.infer<typeof aiIntakeRequestSchema>;
export type AiExtractedCase = z.infer<typeof aiExtractedCaseSchema>;
export type VoiceTranscribeRequest = z.infer<typeof voiceTranscribeRequestSchema>;
export type Clarification = z.infer<typeof clarificationSchema>;
