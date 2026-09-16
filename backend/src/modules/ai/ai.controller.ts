import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service.js';
import { speechService } from './speech.service.js';
import { aiIntakeRequestSchema, voiceTranscribeRequestSchema } from './schemas.js';

export class AiController {
  /**
   * POST /api/v1/ai/analyze
   * Takes natural language text, extracts intent, entities, and checks for clarifications.
   */
  public async analyzeIntake(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = aiIntakeRequestSchema.parse(req.body);
      const result = await aiService.analyzeIntake(validated);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/ai/voice
   * Transcribes voice recording and pipes directly into the conversational intake pipeline.
   */
  public async processVoice(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = voiceTranscribeRequestSchema.parse(req.body);
      const transcription = await speechService.processVoiceInput(
        validated.audioBase64,
        validated.mimeType,
        validated.language
      );

      const aiResult = await aiService.analyzeIntake({
        message: transcription.text,
        languageHint: transcription.detectedLanguage,
      });

      res.status(200).json({
        success: true,
        transcription,
        data: aiResult,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AiController();
