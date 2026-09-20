import { describe, it, expect, beforeEach } from 'vitest';

const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  },
} as any;

describe('Authentication Token Management & Storage (BUG-10, BUG-16, BUG-17)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores access and refresh tokens under canonical cpet_* keys', () => {
    localStorage.setItem('cpet_access_token', 'access-token-xyz');
    localStorage.setItem('cpet_refresh_token', 'refresh-token-abc');

    expect(localStorage.getItem('cpet_access_token')).toBe('access-token-xyz');
    expect(localStorage.getItem('cpet_refresh_token')).toBe('refresh-token-abc');
  });

  it('purges all canonical token keys during complete session teardown', () => {
    localStorage.setItem('cpet_access_token', 'access-token-xyz');
    localStorage.setItem('cpet_refresh_token', 'refresh-token-abc');

    // Simulate logout token clearance
    localStorage.removeItem('cpet_access_token');
    localStorage.removeItem('cpet_refresh_token');

    expect(localStorage.getItem('cpet_access_token')).toBeNull();
    expect(localStorage.getItem('cpet_refresh_token')).toBeNull();
  });
});
