import { CaseType, CasePriority } from './case.js';

export interface Clarification {
  field: string;
  question: string;
  options?: string[];
}

export interface AiIntakeContext {
  intent?: CaseType;
  organizationId?: string;
  organizationName?: string;
  productService?: string;
  category?: string;
  priority?: CasePriority;
  location?: {
    city?: string;
    address?: string;
    pincode?: string;
  };
  structuredData?: Record<string, any>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface AiExtractedCase {
  intent: CaseType;
  confidence: number;
  detectedLanguage: 'en' | 'hi' | 'te' | 'other';
  summary: string;
  organization: {
    matchedId?: string;
    matchedName?: string;
    rawMention?: string;
  };
  productService: string;
  category: string;
  priority: CasePriority;
  structuredData: Record<string, any>;
  location: {
    city?: string;
    address?: string;
    pincode?: string;
  };
  isComplete: boolean;
  nextClarification: Clarification | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface VoiceTranscribeResponse {
  success: boolean;
  transcription: {
    text: string;
    detectedLanguage: 'en' | 'hi' | 'te' | 'other';
    confidence: number;
    durationSeconds: number;
  };
  data: AiExtractedCase;
}
