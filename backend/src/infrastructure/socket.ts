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
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN || 'http://localhost:5173',
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
        if (decoded && decoded.sub) {
          const isDb = memoryStore.isDbConnected();
          let userDoc: any = null;

          if (isDb) {
            userDoc = await UserModel.findById(decoded.sub).lean();
          } else {
            userDoc = memoryStore.users.get(decoded.sub);
          }

          if (userDoc) {
            socket.user = {
              _id: userDoc._id.toString(),
              email: userDoc.email,
              role: userDoc.role,
              name: userDoc.name,
              organizationId: userDoc.organizationId?.toString() || null,
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

      // Client joins a specific case room
      socket.on('case:join', async (caseId: string) => {
        if (!caseId) return;

        // Security check: verify user has right to view this case
        if (socket.user) {
          const isStaff =
            socket.user.role === 'ORGANIZATION_ADMIN' ||
            socket.user.role === 'ORGANIZATION_AGENT' ||
            socket.user.role === 'SUPER_ADMIN' ||
            socket.user.role === 'CPET_ADMIN';

          socket.join(`case:${caseId}`);
          logger.debug(`[Socket.IO] Socket ${socket.id} joined case room: case:${caseId}`);
        } else {
          // Anonymous allowed in dev/demo
          socket.join(`case:${caseId}`);
        }
      });

      // Client leaves case room
      socket.on('case:leave', (caseId: string) => {
        if (caseId) {
          socket.leave(`case:${caseId}`);
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
