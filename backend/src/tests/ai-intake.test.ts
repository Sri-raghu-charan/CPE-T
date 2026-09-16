import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { aiExtractedCaseSchema } from '../modules/ai/schemas.js';

describe('Phase 4 — AI-First Intake, Conversational Forms & Voice Architecture', () => {
  const app = createApp();

  it('1. Text Intake & Entity Extraction: "I have a Lloyd AC and it needs servicing"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'I have a Lloyd AC and it needs servicing.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // Strict schema validation
    expect(() => aiExtractedCaseSchema.parse(data)).not.toThrow();

    expect(data.intent).toBe('SERVICE_REQUEST');
    expect(data.organization.rawMention).toBe('Lloyd');
    expect(data.productService).toContain('Air Conditioner');
    expect(data.category).toBe('Consumer Appliance & Utilities');
    expect(data.priority).toBe('MEDIUM');
    expect(data.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('2. Emergency Blood Extraction with structured parameters', async () => {
    const res = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'Urgent: need 2 units of O- blood immediately at City Trauma Hospital.',
      });

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.intent).toBe('BLOOD_REQUEST');
    expect(data.priority).toBe('URGENT');
    expect(data.structuredData.bloodGroup).toBe('O-');
    expect(data.structuredData.unitsNeeded).toBe(2);
    expect(data.structuredData.hospitalName).toBe('City Trauma Hospital');
  });

  it('3. Multi-turn Clarification Loop: Asks targeted questions and accumulates context', async () => {
    // Turn 1: Vague initial request
    const turn1Res = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'My refrigerator is not working.',
      });

    expect(turn1Res.status).toBe(200);
    const turn1 = turn1Res.body.data;
    expect(turn1.intent).toBe('SERVICE_REQUEST');
    expect(turn1.isComplete).toBe(false);
    expect(turn1.nextClarification).not.toBeNull();
    expect(turn1.nextClarification?.options).toBeDefined();

    // Turn 2: User clarifies specific issue and location
    const turn2Res = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'Cooling stopped completely. Location is Flat 402, Green Meadows, Metro City 500001.',
        context: {
          intent: turn1.intent,
          productService: turn1.productService,
          category: turn1.category,
          conversationHistory: turn1.conversationHistory,
        },
      });

    expect(turn2Res.status).toBe(200);
    const turn2 = turn2Res.body.data;
    expect(turn2.location.city).toBe('Metro City');
    expect(turn2.location.pincode).toBe('500001');
    expect(turn2.structuredData.issueType).toContain('Cooling Defect');
    expect(turn2.isComplete).toBe(true);
    expect(turn2.nextClarification).toBeNull();
  });

  it('4. Multilingual Processing: Hindi and Telugu natural language intake', async () => {
    // Hindi request
    const hiRes = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'मेरा लॉयड एसी ठंडा नहीं कर रहा है और सर्विसिंग चाहिए',
      });

    expect(hiRes.status).toBe(200);
    expect(hiRes.body.data.detectedLanguage).toBe('hi');
    expect(hiRes.body.data.intent).toBe('SERVICE_REQUEST');
    expect(hiRes.body.data.organization.rawMention).toBe('Lloyd');

    // Telugu request
    const teRes = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'రక్తం అత్యవసరం O+ గ్రూప్ 3 యూనిట్లు కావాలి',
      });

    expect(teRes.status).toBe(200);
    expect(teRes.body.data.detectedLanguage).toBe('te');
    expect(teRes.body.data.intent).toBe('BLOOD_REQUEST');
    expect(teRes.body.data.structuredData.bloodGroup).toBe('O+');
    expect(teRes.body.data.structuredData.unitsNeeded).toBe(3);
  });

  it('5. Voice Transcription & Pipeline processing', async () => {
    // Mock base64 audio payload
    const mockAudioBase64 = Buffer.from('RIFF....WAVEfmt ....data....').toString('base64');

    const res = await request(app)
      .post('/api/v1/ai/voice')
      .send({
        audioBase64: mockAudioBase64,
        mimeType: 'audio/webm',
        language: 'en',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transcription).toHaveProperty('text');
    expect(res.body.transcription.detectedLanguage).toBe('en');
    expect(res.body.data).toHaveProperty('intent');
  });

  it('6. Safety Boundary: AI output is strictly schema validated and does not create database case directly', async () => {
    const res = await request(app)
      .post('/api/v1/ai/analyze')
      .send({
        message: 'Water pipeline burst on Main Road',
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    // Verify that the response is an analysis/draft and NOT a database document with _id or referenceNumber
    expect(data).not.toHaveProperty('_id');
    expect(data).not.toHaveProperty('referenceNumber');
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('intent');
  });
});
