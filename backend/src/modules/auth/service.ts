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
import { getEmailProvider } from '../../providers/email/index.js';

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

  public hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(`${otp}:${env.JWT_SECRET}`).digest('hex');
  }

  public hashDestination(target: string): string {
    return crypto.createHash('sha256').update(target.toLowerCase().trim()).digest('hex');
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
    const emailKey = data.email.toLowerCase().trim();

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

    // Verify that a valid, verified OTP challenge exists for this email
    let verifiedOtpRecord: any = null;
    if (memoryStore.isDbConnected()) {
      verifiedOtpRecord = await OtpModel.findOne({
        target: emailKey,
        purpose: { $in: ['SIGNUP', 'EMAIL_VERIFICATION'] },
        isVerified: true,
        expiresAt: { $gt: new Date() },
      }).sort({ updatedAt: -1 });
    } else {
      const memOtp = memoryStore.otps.get(emailKey);
      if (
        memOtp &&
        memOtp.isVerified &&
        (memOtp.purpose === 'SIGNUP' || memOtp.purpose === 'EMAIL_VERIFICATION') &&
        memOtp.expiresAt > new Date()
      ) {
        verifiedOtpRecord = memOtp;
      }
    }

    if (!verifiedOtpRecord) {
      throw new UnauthorizedError(
        'Email verification required. Please verify your email via OTP before completing registration.'
      );
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

    // Invalidate/consume verified OTP challenge to prevent reuse
    if (memoryStore.isDbConnected()) {
      await OtpModel.deleteMany({
        target: emailKey,
        purpose: { $in: ['SIGNUP', 'EMAIL_VERIFICATION'] },
      });
    } else {
      memoryStore.otps.delete(emailKey);
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
    const targetKey = target.toLowerCase().trim();

    // If SIGNUP, prevent duplicate registration
    if (purpose === 'SIGNUP' || purpose === 'EMAIL_VERIFICATION') {
      let existingUser: any;
      if (memoryStore.isDbConnected()) {
        existingUser = await UserModel.findOne({ email: targetKey });
      } else {
        existingUser = Array.from(memoryStore.users.values()).find((u) => u.email === targetKey);
      }
      if (existingUser) {
        throw new ConflictError('An account with this email address already exists. Please sign in instead.');
      }
    }

    // Cooldown check (60 seconds)
    let existingOtp: any = null;
    if (memoryStore.isDbConnected()) {
      existingOtp = await OtpModel.findOne({
        target: targetKey,
        purpose,
        isVerified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });
    } else {
      const mem = memoryStore.otps.get(targetKey);
      if (mem && mem.purpose === purpose && !mem.isVerified && mem.expiresAt > new Date()) {
        existingOtp = mem;
      }
    }

    if (existingOtp && existingOtp.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingOtp.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw new ValidationError(`Please wait ${remainingSeconds} seconds before requesting a new verification code.`);
      }
    }

    // Invalidate previous OTP challenges for this target + purpose
    if (memoryStore.isDbConnected()) {
      await OtpModel.updateMany(
        { target: targetKey, purpose, isVerified: false },
        { $set: { expiresAt: new Date(0) } }
      );
    } else {
      memoryStore.otps.delete(targetKey);
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtp(rawOtp);
    const destinationHash = this.hashDestination(targetKey);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const now = new Date();

    if (memoryStore.isDbConnected()) {
      await OtpModel.create({
        target: targetKey,
        destinationHash,
        otpHash,
        purpose,
        attempts: 0,
        maxAttempts: 5,
        isVerified: false,
        lastSentAt: now,
        expiresAt,
      });
    } else {
      const otpId = crypto.randomUUID();
      memoryStore.otps.set(targetKey, {
        _id: otpId,
        target: targetKey,
        destinationHash,
        otpHash,
        purpose,
        attempts: 0,
        maxAttempts: 5,
        isVerified: false,
        lastSentAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Dispatch real email via EmailProvider
    try {
      await getEmailProvider().sendOtpEmail({
        to: targetKey,
        otp: rawOtp,
        purpose,
      });
    } catch (err: any) {
      // Invalidate challenge immediately if dispatch fails
      if (memoryStore.isDbConnected()) {
        await OtpModel.deleteMany({ target: targetKey, purpose, otpHash });
      } else {
        memoryStore.otps.delete(targetKey);
      }
      throw err;
    }

    logger.info(`[Auth] OTP challenge created and dispatched to ${targetKey} (${purpose})`);

    return {
      message: `Verification code dispatched to ${targetKey}. Valid for 5 minutes.`,
    };
  }

  /**
   * Resend OTP (enforces cooldown and invalidates previous challenge)
   */
  public async resendOtp(target: string, purpose: OtpPurpose): Promise<{ message: string }> {
    return this.requestOtp(target, purpose);
  }

  /**
   * Verify OTP
   */
  public async verifyOtp(
    target: string,
    otp: string,
    purpose: OtpPurpose,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{
    verified: boolean;
    message: string;
    user?: SanitizedUser;
    tokens?: AuthTokens;
  }> {
    const targetKey = target.toLowerCase().trim();
    const candidateHash = this.hashOtp(otp);

    let record: any = null;
    if (memoryStore.isDbConnected()) {
      record = await OtpModel.findOne({
        target: targetKey,
        purpose,
        isVerified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });
    } else {
      const mem = memoryStore.otps.get(targetKey);
      if (mem && mem.purpose === purpose && !mem.isVerified && mem.expiresAt > new Date()) {
        record = mem;
      }
    }

    if (!record) {
      throw new ValidationError('Invalid or expired verification code. Please request a new code.');
    }

    // Check attempts limit (max 5 attempts)
    if (record.attempts >= (record.maxAttempts || 5)) {
      if (memoryStore.isDbConnected()) {
        record.expiresAt = new Date(0);
        await record.save();
      } else {
        memoryStore.otps.delete(targetKey);
      }
      throw new ValidationError('Maximum verification attempts exceeded. Please request a new code.');
    }

    if (record.otpHash !== candidateHash) {
      record.attempts += 1;
      if (memoryStore.isDbConnected()) {
        await record.save();
      }
      if (record.attempts >= (record.maxAttempts || 5)) {
        if (memoryStore.isDbConnected()) {
          record.expiresAt = new Date(0);
          await record.save();
        } else {
          memoryStore.otps.delete(targetKey);
        }
        throw new ValidationError('Maximum verification attempts reached (5/5). This code is now invalidated. Please request a new one.');
      }
      const remaining = (record.maxAttempts || 5) - record.attempts;
      throw new ValidationError(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
    }

    record.isVerified = true;
    record.verifiedAt = new Date();
    if (memoryStore.isDbConnected()) {
      await record.save();
    }

    // For LOGIN purpose: create authenticated session
    if (purpose === 'LOGIN') {
      let user: any = null;
      if (memoryStore.isDbConnected()) {
        user = await UserModel.findOne({ email: targetKey });
      } else {
        user = Array.from(memoryStore.users.values()).find((u) => u.email === targetKey);
      }

      if (!user) {
        throw new ValidationError('No active account found for this email address.');
      }
      if (!user.isActive || user.isDeleted) {
        throw new UnauthorizedError('Account is inactive or suspended.');
      }

      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.createSession(user._id, userAgent, ipAddress);

      return {
        verified: true,
        message: 'OTP verified successfully.',
        user: await this.sanitizeUser(user),
        tokens: { accessToken, refreshToken },
      };
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
