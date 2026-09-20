import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { memoryStore } from './store.js';
import { UserModel, CaseModel } from '@cpet/database';

export interface AuthenticatedSocket extends Socket {
  user?: {
    _id: string;
    email: string;
    role: string;
    name: string;
    organizationId?: string | null;
  };
}

export class SocketManager {
  private static instance: SocketManager;
  private io: SocketIOServer | null = null;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public init(httpServer: HttpServer): SocketIOServer {
    const allowedOrigins = (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim());

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (
            allowedOrigins.includes(origin) ||
            allowedOrigins.includes('*') ||
            (env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
          ) {
            return callback(null, true);
          }
          return callback(new Error('Origin not allowed by CORS policy'));
        },
        credentials: true,
      },
      path: '/socket.io',
    });

    // JWT Authentication Middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
          socket.handshake.query?.token;

        if (!token || typeof token !== 'string') {
          // Allow anonymous socket connections with restricted access if needed
          return next();
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        const userId = decoded?.userId || decoded?.sub;
        if (decoded && userId) {
          const isDb = memoryStore.isDbConnected();
          let userDoc: any = null;

          if (isDb) {
            userDoc = await UserModel.findById(userId).lean();
          } else {
            userDoc = memoryStore.users.get(userId);
          }

          if (userDoc) {
            socket.user = {
              _id: userDoc._id.toString(),
              email: userDoc.email,
              role: userDoc.role,
              name: userDoc.name,
              organizationId: userDoc.organizationId?.toString() || null,
            };
          } else if (decoded.email && decoded.role) {
            socket.user = {
              _id: userId.toString(),
              email: decoded.email,
              role: decoded.role,
              name: decoded.name || decoded.email,
              organizationId: decoded.organizationId?.toString() || null,
            };
          }
        }
        next();
      } catch (err: any) {
        logger.warn(`[Socket.IO] Authentication handshake warning: ${err.message}`);
        next(); // Don't crash, allow connection to proceed unauthenticated
      }
    });

    // Connection Handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`[Socket.IO] Client connected: ${socket.id} (User: ${socket.user?.email || 'guest'})`);

      // Automatically join personal user room if authenticated
      if (socket.user?._id) {
        socket.join(`user:${socket.user._id}`);

        // Automatically join organization triage room if user is staff/admin
        if (socket.user.organizationId) {
          socket.join(`org:${socket.user.organizationId}`);
        }
      }

      // Client joins a specific case room - Enforce strict authentication and authorization
      socket.on('case:join', async (caseId: string) => {
        if (!caseId) return;

        // Anonymous users are strictly denied from confidential case rooms
        if (!socket.user) {
          logger.warn(`[Socket.IO] Rejected anonymous socket ${socket.id} from joining case:${caseId}`);
          socket.emit('error', { message: 'Authentication required to join case room' });
          return;
        }

        try {
          let caseDoc: any = null;
          if (memoryStore.isDbConnected()) {
            caseDoc = await CaseModel.findById(caseId).lean();
          } else {
            caseDoc = memoryStore.cases.get(caseId);
          }

          if (!caseDoc) {
            socket.emit('error', { message: `Case '${caseId}' not found` });
            return;
          }

          const requesterIdStr =
            caseDoc.requesterId?._id?.toString() || caseDoc.requesterId?.toString();
          const orgIdStr =
            caseDoc.organizationId?._id?.toString() || caseDoc.organizationId?.toString();

          const isCitizen = socket.user.role === 'CITIZEN' || socket.user.role === 'DONOR';
          const isOrgStaff =
            socket.user.role === 'ORGANIZATION_ADMIN' || socket.user.role === 'ORGANIZATION_AGENT';
          const isPlatformAdmin =
            socket.user.role === 'SUPER_ADMIN' || socket.user.role === 'CPET_ADMIN';

          let isAuthorized = false;

          if (isPlatformAdmin) {
            isAuthorized = true;
          } else if (isCitizen) {
            isAuthorized = requesterIdStr === socket.user._id;
          } else if (isOrgStaff) {
            isAuthorized = Boolean(socket.user.organizationId && socket.user.organizationId === orgIdStr);
          }

          if (!isAuthorized) {
            logger.warn(
              `[Socket.IO] Access denied: User ${socket.user._id} (${socket.user.role}) unauthorized for case:${caseId}`
            );
            socket.emit('error', { message: 'Access denied: You do not have permission to join this case room' });
            return;
          }

          socket.join(`case:${caseId}`);
          logger.debug(`[Socket.IO] Socket ${socket.id} (User: ${socket.user.email}) joined case:${caseId}`);
        } catch (err: any) {
          logger.error(`[Socket.IO] Case room authorization error for ${caseId}: ${err.message}`);
          socket.emit('error', { message: 'Internal authorization error' });
        }
      });

      // Client leaves case room
      socket.on('case:leave', (caseId: string) => {
        if (caseId) {
          socket.leave(`case:${caseId}`);
        }
      });

      // Organization triage room joining with tenant validation
      socket.on('org:join', (orgId: string) => {
        if (!orgId) return;
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required to join organization room' });
          return;
        }

        const isPlatformAdmin =
          socket.user.role === 'SUPER_ADMIN' || socket.user.role === 'CPET_ADMIN';
        if (isPlatformAdmin || socket.user.organizationId === orgId) {
          socket.join(`org:${orgId}`);
          logger.debug(`[Socket.IO] Socket ${socket.id} joined org room: org:${orgId}`);
        } else {
          socket.emit('error', { message: 'Access denied: Unauthorized organization room access' });
        }
      });

      socket.on('org:leave', (orgId: string) => {
        if (orgId) {
          socket.leave(`org:${orgId}`);
        }
      });

      socket.on('disconnect', () => {
        logger.debug(`[Socket.IO] Client disconnected: ${socket.id}`);
      });
    });

    logger.info('[Socket.IO] Real-time communication server initialized');
    return this.io;
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcast an event to everyone inside a specific case room
   */
  public emitToCase(caseId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`case:${caseId}`).emit(event, data);
    }
  }

  /**
   * Broadcast an event to all staff in an organization queue
   */
  public emitToOrg(orgId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`org:${orgId}`).emit(event, data);
    }
  }

  /**
   * Send a direct notification/event to a specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }
}

export const socketManager = SocketManager.getInstance();
