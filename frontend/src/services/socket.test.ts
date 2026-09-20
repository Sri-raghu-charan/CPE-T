import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockOn = vi.fn();

const mockSocketInstance = {
  emit: mockEmit,
  disconnect: mockDisconnect,
  on: mockOn,
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocketInstance),
}));

// Provide window and localStorage mocks for Node test environment
const mockStorage: Record<string, string> = {};
global.window = {
  location: { origin: 'http://localhost:5173' },
} as any;

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

import { getSocket, disconnectSocket, joinCaseRoom, leaveCaseRoom, joinOrgRoom, leaveOrgRoom } from './socket.js';
import { io } from 'socket.io-client';

describe('Frontend WebSocket Gateway Service (BUG-9 & BUG-10 Verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage['cpet_access_token'] = 'test-stored-jwt-token';
  });

  it('should initialize socket using cpet_access_token from localStorage', () => {
    disconnectSocket();
    const socket = getSocket();
    expect(socket).toBeDefined();
    expect(io).toHaveBeenCalledWith(
      'http://localhost:5173',
      expect.objectContaining({
        auth: { token: 'test-stored-jwt-token' },
      })
    );
  });

  it('should emit case:join and case:leave events with caseId payload', () => {
    joinCaseRoom('case-12345');
    expect(mockEmit).toHaveBeenCalledWith('case:join', 'case-12345');

    leaveCaseRoom('case-12345');
    expect(mockEmit).toHaveBeenCalledWith('case:leave', 'case-12345');
  });

  it('should emit org:join and org:leave events with orgId payload', () => {
    joinOrgRoom('org-67890');
    expect(mockEmit).toHaveBeenCalledWith('org:join', 'org-67890');

    leaveOrgRoom('org-67890');
    expect(mockEmit).toHaveBeenCalledWith('org:leave', 'org-67890');
  });

  it('should cleanly disconnect and reset socket on disconnectSocket', () => {
    disconnectSocket();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
