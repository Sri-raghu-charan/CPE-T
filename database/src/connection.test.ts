import { describe, it, expect } from 'vitest';
import { dbManager } from './connection.js';

describe('DatabaseManager', () => {
  it('should initialize as singleton and report disconnected state when not connected', async () => {
    const health = await dbManager.checkHealth();
    expect(health.status).toBe('disconnected');
    expect(health.readyState).toBe(0);
  });
});
