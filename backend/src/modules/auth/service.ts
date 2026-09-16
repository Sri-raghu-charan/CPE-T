import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
  UserModel,
  IUser,
  OrganizationModel,
  SessionModel,
  OtpModel,
  OtpPurpose,
  UserRole,
} from '@cpet/database';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors.js';
import { AuthJwtPayload } from '../../middleware/auth.js';
import { memoryStore } from '../../infrastructure/store.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  organizationId?: string | null;
  organizationName?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
}

export class AuthService {
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  public async sanitizeUser(user: any): Promise<SanitizedUser> {
    let organizationName: string | null = null;
    if (user.organizationId) {
      if (memoryStore.isDbConnected()) {
        const org = await OrganizationModel.findById(user.organizationId).lean();
        if (org) organizationName = org.name;
      } else {
        const org = memoryStore.organizations.get(user.organizationId.toString());
        if (org) organizationName = org.name;
      }
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
      organizationName,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
    };
  }

  public generateAccessToken(user: any): string {
    const payload: AuthJwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }

  public async createSession(userId: any, userAgent?: string, ipAddress?: string): Promise<string> {
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashSecret(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    if (memoryStore.isDbConnected()) {
      await SessionModel.create({
        userId,
        refreshTokenHash,
        userAgent,
        ipAddress,
        isRevoked: false,
        expiresAt,
      });
    } else {
      const sessionId = crypto.randomUUID();
      memoryStore.sessions.set(refreshTokenHash, {
        _id: sessionId,
        userId: userId.toString(),
        refreshTokenHash,
        isRevoked: false,
        expiresAt,
        createdAt: new Date(),
      });
    }

    return rawRefreshToken;
  }

  /**
   * Citizen Registration
   */
  public async registerCitizen(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    consent: { termsAccepted: boolean; termsVersion: string };
  }): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    const emailKey = data.email.toLowerCase();

    if (memoryStore.isDbConnected()) {
      const existing = await UserModel.findOne({ email: emailKey });
      if (existing) {
        throw new ConflictError('An account with this email address already exists.');
      }
    } else {
      const existing = Array.from(memoryStore.users.values()).find((u) => u.email === emailKey);
      if (existing) {
        throw new ConflictError('An account with this email address already exists.');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    let user: any;
    if (memoryStore.isDbConnected()) {
      user = await UserModel.create({
        name: data.name,
        email: emailKey,
        phone: data.phone,
        passwordHash,
        role: 'CITIZEN',
        organizationId: null,
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        consent: {
          termsAccepted: data.consent.termsAccepted,
          termsVersion: data.consent.termsVersion,
          acceptedAt: new Date(),
        },
      });
    } else {
      const newId = crypto.randomUUID();
      user = {
        _id: newId,
        name: data.name,
        email: emailKey,
        phone: data.phone,
        passwordHash,
        role: 'CITIZEN' as UserRole,
        organizationId: null,
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        consent: {
          termsAccepted: data.consent.termsAccepted,
          termsVersion: data.consent.termsVersion,
          acceptedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.users.set(newId, user);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createSession(user._id);

    return {
      user: await this.sanitizeUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Organization Onboarding & Admin Account Registration
   */
  public async registerOrganization(data: {
    organizationName: string;
    organizationType: any;
    category?: string;
    adminName: string;
    email: string;
    password: string;
    contactPhone?: string;
    address?: string;
    consent: { termsAccepted: boolean; termsVersion: string };
  }): Promise<{ user: SanitizedUser; organizationId: string; tokens: AuthTokens }> {
    const emailKey = data.email.toLowerCase();

    if (memoryStore.isDbConnected()) {
      const existingUser = await UserModel.findOne({ email: emailKey });
      if (existingUser) {
        throw new ConflictError('A user with this corporate email already exists.');
      }
    } else {
      const existingUser = Array.from(memoryStore.users.values()).find((u) => u.email === emailKey);
      if (existingUser) {
        throw new ConflictError('A user with this corporate email already exists.');
      }
    }

    let baseSlug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;

    let organization: any;
    const passwordHash = await bcrypt.hash(data.password, 10);

    if (memoryStore.isDbConnected()) {
      let count = 1;
      while (await OrganizationModel.findOne({ slug })) {
        slug = `${baseSlug}-${count++}`;
      }

      organization = await OrganizationModel.create({
        name: data.organizationName,
        slug,
        type: data.organizationType,
        category: data.category || 'General',
        status: 'VERIFIED',
        contactEmail: emailKey,
        contactPhone: data.contactPhone,
        address: data.address,
        settings: {
          autoAssign: false,
          defaultSlaHours: 48,
        },
      });

      const adminUser = await UserModel.create({
        name: data.adminName,
        email: emailKey,
        phone: data.contactPhone,
        passwordHash,
        role: 'ORGANIZATION_ADMIN',
        organizationId: organization._id,
        isEmailVerified: true,
        isActive: true,
        consent: {
          termsAccepted: data.consent.termsAccepted,
          termsVersion: data.consent.termsVersion,
          acceptedAt: new Date(),
        },
      });

      const accessToken = this.generateAccessToken(adminUser);
      const refreshToken = await this.createSession(adminUser._id);

      return {
        user: await this.sanitizeUser(adminUser),
        organizationId: organization._id.toString(),
        tokens: { accessToken, refreshToken },
      };
    } else {
      const orgId = crypto.randomUUID();
      organization = {
        _id: orgId,
        name: data.organizationName,
        slug,
        type: data.organizationType,
        category: data.category || 'General',
        status: 'VERIFIED',
        contactEmail: emailKey,
        contactPhone: data.contactPhone,
        address: data.address,
        settings: { autoAssign: false, defaultSlaHours: 48 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.organizations.set(orgId, organization);

      const userId = crypto.randomUUID();
      const adminUser = {
        _id: userId,
        name: data.adminName,
        email: emailKey,
        phone: data.contactPhone,
        passwordHash,
        role: 'ORGANIZATION_ADMIN' as UserRole,
        organizationId: orgId,
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        consent: {
          termsAccepted: data.consent.termsAccepted,
          termsVersion: data.consent.termsVersion,
          acceptedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.users.set(userId, adminUser);

      const accessToken = this.generateAccessToken(adminUser);
      const refreshToken = await this.createSession(userId);

      return {
        user: await this.sanitizeUser(adminUser),
        organizationId: orgId,
        tokens: { accessToken, refreshToken },
      };
    }
  }

  /**
   * Standard Password Login
   */
  public async login(
    email: string,
    candidatePassword: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    const emailKey = email.toLowerCase();
    let user: any;

    if (memoryStore.isDbConnected()) {
      user = await UserModel.findOne({ email: emailKey }).select('+passwordHash');
    } else {
      user = Array.from(memoryStore.users.values()).find((u) => u.email === emailKey);
    }

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (!user.isActive || user.isDeleted) {
      throw new UnauthorizedError('Account is inactive or suspended.');
    }

    const isMatch = await bcrypt.compare(candidatePassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.save) {
      user.lastLoginAt = new Date();
      await user.save();
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createSession(user._id, userAgent, ipAddress);

    return {
      user: await this.sanitizeUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Request OTP
   */
  public async requestOtp(target: string, purpose: OtpPurpose): Promise<{ message: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this.hashSecret(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (memoryStore.isDbConnected()) {
      await OtpModel.create({
        target: target.toLowerCase(),
        otpHash,
        purpose,
        attempts: 0,
        isVerified: false,
        expiresAt,
      });
    } else {
      const otpId = crypto.randomUUID();
      memoryStore.otps.set(target.toLowerCase(), {
        _id: otpId,
        target: target.toLowerCase(),
        otpHash,
        purpose,
        isVerified: false,
        expiresAt,
        createdAt: new Date(),
      });
    }

    logger.info(`[Auth] OTP generated for target ${target} (${purpose}): ${otp}`);

    return {
      message: `OTP dispatched to ${target}. Valid for 10 minutes.`,
    };
  }

  /**
   * Verify OTP
   */
  public async verifyOtp(
    target: string,
    otp: string,
    purpose: OtpPurpose
  ): Promise<{ verified: boolean; message: string }> {
    // In dev / test, accept test code 123456
    if (env.NODE_ENV !== 'production' && otp === '123456') {
      return { verified: true, message: 'OTP verified successfully (dev bypass).' };
    }

    const otpHash = this.hashSecret(otp);

    if (memoryStore.isDbConnected()) {
      const record = await OtpModel.findOne({
        target: target.toLowerCase(),
        purpose,
        isVerified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!record) {
        throw new ValidationError('Invalid or expired OTP.');
      }

      if (record.otpHash !== otpHash) {
        record.attempts += 1;
        await record.save();
        throw new ValidationError('Incorrect OTP. Please check and try again.');
      }

      record.isVerified = true;
      await record.save();
    } else {
      const record = memoryStore.otps.get(target.toLowerCase());
      if (!record || record.isVerified || record.expiresAt < new Date()) {
        throw new ValidationError('Invalid or expired OTP.');
      }

      if (record.otpHash !== otpHash) {
        throw new ValidationError('Incorrect OTP. Please check and try again.');
      }

      record.isVerified = true;
    }

    return { verified: true, message: 'OTP verified successfully.' };
  }

  /**
   * Rotate Refresh Token
   */
  public async refreshTokens(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshTokenHash = this.hashSecret(rawRefreshToken);

    let session: any;
    if (memoryStore.isDbConnected()) {
      session = await SessionModel.findOne({
        refreshTokenHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });
    } else {
      session = memoryStore.sessions.get(refreshTokenHash);
      if (session && (session.isRevoked || session.expiresAt < new Date())) {
        session = null;
      }
    }

    if (!session) {
      throw new UnauthorizedError('Invalid, expired, or revoked refresh token. Please sign in again.');
    }

    session.isRevoked = true;
    if (session.save) await session.save();

    let user: any;
    if (memoryStore.isDbConnected()) {
      user = await UserModel.findById(session.userId);
    } else {
      user = memoryStore.users.get(session.userId);
    }

    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedError('User account not found or inactive.');
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createSession(user._id, userAgent, ipAddress);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke Session on Logout
   */
  public async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const refreshTokenHash = this.hashSecret(rawRefreshToken);
      if (memoryStore.isDbConnected()) {
        await SessionModel.updateMany({ refreshTokenHash }, { $set: { isRevoked: true } });
      } else {
        const session = memoryStore.sessions.get(refreshTokenHash);
        if (session) session.isRevoked = true;
      }
    }
  }
}

export const authService = new AuthService();
