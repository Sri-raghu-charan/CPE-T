import mongoose, { ConnectOptions } from 'mongoose';

export interface DatabaseHealth {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  readyState: number;
  host?: string;
  databaseName?: string;
  latencyMs?: number;
}

export interface DbConnectionOptions {
  uri: string;
  maxPoolSize?: number;
  minPoolSize?: number;
  serverSelectionTimeoutMS?: number;
  connectTimeoutMS?: number;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnecting: boolean = false;

  private constructor() {
    this.setupListeners();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private setupListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('[Database] MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB connection lost');
    });
  }

  public async connect(options: DbConnectionOptions): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    const connectOptions: ConnectOptions = {
      maxPoolSize: options.maxPoolSize || 50,
      minPoolSize: options.minPoolSize || 5,
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
      connectTimeoutMS: options.connectTimeoutMS || 10000,
    };

    try {
      await mongoose.connect(options.uri, connectOptions);
      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      console.error('[Database] Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Database] MongoDB disconnected gracefully');
    }
  }

  public async checkHealth(): Promise<DatabaseHealth> {
    const state = mongoose.connection.readyState;
    const statusMap: Record<number, DatabaseHealth['status']> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnected',
    };

    const health: DatabaseHealth = {
      status: statusMap[state] || 'error',
      readyState: state,
      host: mongoose.connection.host,
      databaseName: mongoose.connection.name,
    };

    if (state === 1 && mongoose.connection.db) {
      const start = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        health.latencyMs = Date.now() - start;
      } catch (err) {
        health.status = 'error';
      }
    }

    return health;
  }
}

export const dbManager = DatabaseManager.getInstance();
