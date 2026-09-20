import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

/**
 * Returns or initializes the authenticated Socket.IO singleton.
 */
export function getSocket(token?: string | null): Socket {
  const activeToken = token || localStorage.getItem('cpet_access_token');

  if (socketInstance && currentToken === activeToken && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentToken = activeToken;

  // Use current origin in browser or fallback to localhost:5000
  const socketUrl = window.location.origin;

  socketInstance = io(socketUrl, {
    auth: {
      token: activeToken || '',
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    // Connected to CPET real-time gateway
  });

  socketInstance.on('connect_error', () => {
    // Reconnection is handled automatically
  });

  return socketInstance;
}

/**
 * Cleanly disconnects the current socket connection (e.g. on logout).
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

/**
 * Joins a specific case room for live two-way message updates.
 */
export function joinCaseRoom(caseId: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('case:join', caseId);
  }
}

/**
 * Leaves a case room.
 */
export function leaveCaseRoom(caseId: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('case:leave', caseId);
  }
}

/**
 * Joins an organization room for live queue/triage notifications.
 */
export function joinOrgRoom(orgId: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('org:join', orgId);
  }
}

/**
 * Leaves an organization room.
 */
export function leaveOrgRoom(orgId: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('org:leave', orgId);
  }
}
