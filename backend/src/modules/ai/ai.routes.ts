import { Router } from 'express';
import { aiController } from './ai.controller.js';

export const aiRouter = Router();

/**
 * POST /api/v1/ai/analyze
 * Natural conversational intake analysis
 */
aiRouter.post('/analyze', aiController.analyzeIntake);

/**
 * POST /api/v1/ai/voice
 * Voice audio transcription and structured intake
 */
aiRouter.post('/voice', aiController.processVoice);
