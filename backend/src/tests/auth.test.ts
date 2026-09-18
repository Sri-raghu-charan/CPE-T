import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { UserModel, SessionModel, OtpModel } from '@cpet/database';
import { setEmailProvider } from '../providers/email/index.js';
import { authService } from '../modules/auth/service.js';
import { memoryStore } from '../infrastructure/store.js';

describe('Phase 2 — Authentication & Session Management', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Citizen signup should require verified OTP, hash password, and return sanitized user profile with tokens', async () => {
    vi.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(OtpModel, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        target: 'john@cpet.org',
        purpose: 'SIGNUP',
        isVerified: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      }),
    } as any);
    vi.spyOn(OtpModel, 'deleteMany').mockResolvedValue({} as any);

    vi.spyOn(UserModel, 'create').mockResolvedValue({
      _id: '66d000000000000000000001',
      name: 'John Citizen',
      email: 'john@cpet.org',
      phone: '+1-555-0100',
      role: 'CITIZEN',
      organizationId: null,
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      consent: { termsAccepted: true, termsVersion: '1.0', acceptedAt: new Date() },
      createdAt: new Date(),
    } as any);
    vi.spyOn(SessionModel, 'create').mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/auth/citizen/signup')
      .send({
        name: 'John Citizen',
        email: 'john@cpet.org',
        password: 'SecurePassword123!',
        phone: '+1-555-0100',
        consent: {
          termsAccepted: true,
          termsVersion: '1.0',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('john@cpet.org');
    expect(res.body.data.user.role).toBe('CITIZEN');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it('Login with invalid credentials should return 401 Unauthorized', async () => {
    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@cpet.org',
        password: 'Password123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Login with valid credentials should succeed and issue tokens', async () => {
    const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
    const mockUser = {
      _id: '66d000000000000000000001',
      name: 'John Citizen',
      email: 'john@cpet.org',
      role: 'CITIZEN',
      isActive: true,
      isDeleted: false,
      passwordHash: hashedPassword,
      save: vi.fn().mockResolvedValue(true),
      createdAt: new Date(),
    };

    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    } as any);
    vi.spyOn(SessionModel, 'create').mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john@cpet.org',
        password: 'CorrectPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.name).toBe('John Citizen');
  });

  it('OTP Request & Verification should validate accurately with real cryptographic hashing', async () => {
    let capturedOtp = '';
    setEmailProvider({
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
      sendOtpEmail: vi.fn().mockImplementation(async (opts) => {
        capturedOtp = opts.otp;
        return { success: true };
      }),
    });

    vi.spyOn(OtpModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(OtpModel, 'create').mockResolvedValue({} as any);
    vi.spyOn(OtpModel, 'updateMany').mockResolvedValue({} as any);

    // Seed user in memoryStore for LOGIN verification
    memoryStore.users.set('john-user-1', {
      _id: '66d000000000000000000001',
      name: 'John Citizen',
      email: 'john@cpet.org',
      passwordHash: 'hash',
      role: 'CITIZEN',
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      consent: { termsAccepted: true, termsVersion: '1.0', acceptedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const reqRes = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({
        target: 'john@cpet.org',
        purpose: 'LOGIN',
      });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);
    expect(capturedOtp).toMatch(/^\d{6}$/);

    // Mock record retrieval with hashed OTP
    const mockRecord = {
      target: 'john@cpet.org',
      purpose: 'LOGIN',
      otpHash: authService.hashOtp(capturedOtp),
      attempts: 0,
      maxAttempts: 5,
      isVerified: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(OtpModel, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockRecord),
    } as any);

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        target: 'john@cpet.org',
        otp: capturedOtp,
        purpose: 'LOGIN',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    const memRecord = memoryStore.otps.get('john@cpet.org');
    expect(memRecord?.isVerified).toBe(true);
  });
});
