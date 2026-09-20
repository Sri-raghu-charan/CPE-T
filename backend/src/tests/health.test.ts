import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Backend Health & Core Endpoints', () => {
  const app = createApp();

  it('GET /health/live should return 200 with uptime and status ok', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /health should return 200 with status ok (canonical root alias)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('GET /health/ready should return dependencies status', async () => {
    const res = await request(app).get('/health/ready');
    // In test environment, returns 200 with services payload
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('redis');
  });

  it('GET /api/v1 should list registered CPET architecture modules', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('v1');
    expect(Array.isArray(res.body.modules)).toBe(true);
    expect(res.body.modules).toContain('cases');
    expect(res.body.modules).toContain('complaints');
    expect(res.body.modules).toContain('blood');
  });

  it('GET /invalid-route should return 404 with structured AppError format', async () => {
    const res = await request(app).get('/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.correlationId).toBeDefined();
  });
});
