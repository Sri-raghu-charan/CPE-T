import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../app.js';
import { authService } from '../modules/auth/service.js';
import { UserModel, OtpModel, SessionModel } from '@cpet/database';
import { setEmailProvider, EmailProvider } from '../providers/email/index.js';
import { memoryStore } from '../infrastructure/store.js';
import { logger } from '../utils/logger.js';

describe('Production-Grade Email OTP Authentication Test Suite', () => {
  const app = createApp();

  let capturedOtp = '';
  let mockEmailProvider: EmailProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    memoryStore.otps.clear();
    memoryStore.users.clear();
    capturedOtp = '';

    mockEmailProvider = {
      sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-msg-1' }),
      sendOtpEmail: vi.fn().mockImplementation(async (opts) => {
        capturedOtp = opts.otp;
        return { success: true, messageId: 'otp-msg-1' };
      }),
    };
    setEmailProvider(mockEmailProvider);
  });

  // 1. OTP Generation
  it('1. OTP Generation: should generate a cryptographically secure 6-digit numeric OTP', async () => {
    const randomSpy = vi.spyOn(crypto, 'randomInt');
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    expect(randomSpy).toHaveBeenCalledWith(100000, 1000000);
    expect(capturedOtp).toMatch(/^\d{6}$/);
    const numericValue = parseInt(capturedOtp, 10);
    expect(numericValue).toBeGreaterThanOrEqual(100000);
    expect(numericValue).toBeLessThan(1000000);
  });

  // 2. OTP Hashing
  it('2. OTP Hashing: should store a secure SHA-256 hash and never store plaintext OTP', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    const memRecord = memoryStore.otps.get('citizen@cpet.org');
    expect(memRecord).toBeDefined();
    expect(memRecord!.otpHash).toBeDefined();
    expect(memRecord!.otpHash).not.toBe(capturedOtp);
    expect(memRecord!.otpHash).toHaveLength(64); // SHA-256 hex string length
    expect(memRecord!.otpHash).toBe(authService.hashOtp(capturedOtp));
  });

  // 3. Correct OTP Verification
  it('3. Correct OTP Verification: should verify valid OTP and mark challenge verified', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');
    const result = await authService.verifyOtp('citizen@cpet.org', capturedOtp, 'SIGNUP');

    expect(result.verified).toBe(true);
    expect(result.message).toBe('OTP verified successfully.');

    const memRecord = memoryStore.otps.get('citizen@cpet.org');
    expect(memRecord!.isVerified).toBe(true);
    expect(memRecord!.verifiedAt).toBeDefined();
  });

  // 4. Incorrect OTP
  it('4. Incorrect OTP: should reject incorrect OTP and increment attempt counter', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    await expect(authService.verifyOtp('citizen@cpet.org', '000000', 'SIGNUP')).rejects.toThrow(
      /Incorrect verification code/
    );

    const memRecord = memoryStore.otps.get('citizen@cpet.org');
    expect(memRecord!.attempts).toBe(1);
    expect(memRecord!.isVerified).toBe(false);
  });

  // 5. Expired OTP
  it('5. Expired OTP: should reject verification if OTP has expired (> 5 minutes)', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    // Simulate expiration by backdating expiresAt
    const memRecord = memoryStore.otps.get('citizen@cpet.org');
    memRecord!.expiresAt = new Date(Date.now() - 1000); // 1 sec in the past

    await expect(authService.verifyOtp('citizen@cpet.org', capturedOtp, 'SIGNUP')).rejects.toThrow(
      /Invalid or expired verification code/
    );
  });

  // 6. Five Failed Attempts Tracking
  it('6. Five Failed Attempts: should allow up to 4 failed attempts and show remaining count', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    for (let i = 1; i <= 4; i++) {
      await expect(authService.verifyOtp('citizen@cpet.org', '111111', 'SIGNUP')).rejects.toThrow(
        new RegExp(`${5 - i} attempt\\(s\\) remaining`)
      );
    }

    const memRecord = memoryStore.otps.get('citizen@cpet.org');
    expect(memRecord!.attempts).toBe(4);
  });

  // 7. Sixth Verification Attempt Rejected & Challenge Invalidation
  it('7. Sixth Verification Attempt Rejected: should invalidate challenge and reject verification', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    // 5 failed attempts
    for (let i = 1; i <= 4; i++) {
      await expect(authService.verifyOtp('citizen@cpet.org', '111111', 'SIGNUP')).rejects.toThrow();
    }
    // 5th failed attempt reaches limit
    await expect(authService.verifyOtp('citizen@cpet.org', '111111', 'SIGNUP')).rejects.toThrow(
      /Maximum verification attempts reached/
    );

    // 6th attempt (even with correct OTP) must be rejected
    await expect(authService.verifyOtp('citizen@cpet.org', capturedOtp, 'SIGNUP')).rejects.toThrow(
      /Invalid or expired verification code|Maximum verification attempts exceeded/
    );
  });

  // 8. Resend Cooldown (60 seconds)
  it('8. Resend Cooldown: should enforce 60-second cooldown on consecutive OTP requests', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');

    // Immediate second request within 60s must fail
    await expect(authService.requestOtp('citizen@cpet.org', 'SIGNUP')).rejects.toThrow(
      /Please wait \d+ seconds before requesting a new verification code/
    );
  });

  // 9. Previous OTP Invalidated after Resend
  it('9. Previous OTP Invalidated: previous OTP must fail after cooldown passes and new OTP is sent', async () => {
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');
    const firstOtp = capturedOtp;

    // Simulate passage of 61 seconds
    const memRecord = memoryStore.otps.get('citizen@cpet.org');
    memRecord!.lastSentAt = new Date(Date.now() - 61 * 1000);

    // Request new OTP
    await authService.requestOtp('citizen@cpet.org', 'SIGNUP');
    const secondOtp = capturedOtp;

    expect(secondOtp).toBeDefined();

    // First OTP must now be rejected
    await expect(authService.verifyOtp('citizen@cpet.org', firstOtp, 'SIGNUP')).rejects.toThrow(
      /Incorrect verification code/
    );

    // Second OTP must succeed
    const res = await authService.verifyOtp('citizen@cpet.org', secondOtp, 'SIGNUP');
    expect(res.verified).toBe(true);
  });

  // 10. Rate Limiting on OTP Endpoints
  it('10. Rate Limiting: should enforce rate limiting on repeated requests', async () => {
    const email = 'rate.limit.target@cpet.org';

    // Send requests until rate limiter blocks (max 50 requests in test mode)
    let blockedRes: any = null;
    for (let i = 0; i < 55; i++) {
      blockedRes = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ email, purpose: 'SIGNUP' });
      if (blockedRes.status === 429) break;
    }

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // 11. Invalid Email Validation
  it('11. Invalid Email: should reject invalid email format in request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ email: 'not-an-email', purpose: 'SIGNUP' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 12. Duplicate Signup Handling
  it('12. Duplicate Signup: should prevent OTP request for already registered email', async () => {
    // Seed existing user
    memoryStore.users.set('existing-user-1', {
      _id: 'existing-user-1',
      name: 'Existing Citizen',
      email: 'existing@cpet.org',
      passwordHash: 'hash',
      role: 'CITIZEN',
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      consent: { termsAccepted: true, termsVersion: '1.0', acceptedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(authService.requestOtp('existing@cpet.org', 'SIGNUP')).rejects.toThrow(
      /An account with this email address already exists/
    );
  });

  // 13. SMTP Delivery Failure Handling
  it('13. SMTP Failure: should handle email delivery failure safely and cleanup challenge', async () => {
    setEmailProvider({
      sendEmail: vi.fn().mockRejectedValue(new Error('SMTP Connection Refused')),
      sendOtpEmail: vi.fn().mockRejectedValue(new Error('SMTP Connection Refused')),
    });

    await expect(authService.requestOtp('smtp.fail@cpet.org', 'SIGNUP')).rejects.toThrow(
      /SMTP Connection Refused/
    );

    // Verification challenge should NOT be left active
    expect(memoryStore.otps.has('smtp.fail@cpet.org')).toBe(false);
  });

  // 14. Successful Citizen Signup After OTP Verification
  it('14. Successful Signup: account is created and activated after OTP verification', async () => {
    await authService.requestOtp('newcitizen@cpet.org', 'SIGNUP');
    await authService.verifyOtp('newcitizen@cpet.org', capturedOtp, 'SIGNUP');

    const signupResult = await authService.registerCitizen({
      name: 'New Citizen',
      email: 'newcitizen@cpet.org',
      password: 'SecurePassword123!',
      phone: '+1-555-0199',
      consent: { termsAccepted: true, termsVersion: '1.0' },
    });

    expect(signupResult.user.email).toBe('newcitizen@cpet.org');
    expect(signupResult.user.isEmailVerified).toBe(true);
    expect(signupResult.tokens.accessToken).toBeDefined();
    expect(signupResult.tokens.refreshToken).toBeDefined();

    // Verified OTP challenge must be consumed/deleted
    expect(memoryStore.otps.has('newcitizen@cpet.org')).toBe(false);
  });

  // 15. User Cannot Bypass OTP
  it('15. User Cannot Bypass OTP: direct registration without OTP verification must fail', async () => {
    await expect(
      authService.registerCitizen({
        name: 'Sneaky User',
        email: 'unverified@cpet.org',
        password: 'SecurePassword123!',
        consent: { termsAccepted: true, termsVersion: '1.0' },
      })
    ).rejects.toThrow(/Email verification required/);
  });

  // 16. OTP is Never Returned Through API Responses
  it('16. No OTP in API: endpoints must never expose OTP in JSON response', async () => {
    const sendRes = await request(app)
      .post('/api/v1/auth/email-otp/send')
      .send({ email: 'secret.check@cpet.org', purpose: 'SIGNUP' });

    expect(sendRes.status).toBe(200);
    expect(JSON.stringify(sendRes.body)).not.toContain(capturedOtp);
    expect(sendRes.body).not.toHaveProperty('otp');
    expect(sendRes.body).not.toHaveProperty('otpHash');

    const verifyRes = await request(app)
      .post('/api/v1/auth/email-otp/verify')
      .send({ email: 'secret.check@cpet.org', otp: capturedOtp, purpose: 'SIGNUP' });

    expect(verifyRes.status).toBe(200);
    expect(JSON.stringify(verifyRes.body)).not.toContain(capturedOtp);
    expect(verifyRes.body).not.toHaveProperty('otp');
    expect(verifyRes.body).not.toHaveProperty('otpHash');
  });

  // 17. OTP is Never Logged
  it('17. No OTP in Logs: logger must never log plaintext OTP', async () => {
    const infoSpy = vi.spyOn(logger, 'info');
    const warnSpy = vi.spyOn(logger, 'warn');
    const errorSpy = vi.spyOn(logger, 'error');

    await authService.requestOtp('logger.test@cpet.org', 'SIGNUP');

    const allLoggedStrings = [
      ...infoSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
      ...errorSpy.mock.calls.flat(),
    ]
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(' ');

    expect(allLoggedStrings).not.toContain(capturedOtp);
  });

  // 18. Authentication Session Created on OTP Login
  it('18. Session on OTP Login: verifyOtp with purpose LOGIN returns authenticated session tokens', async () => {
    // Seed user for login
    memoryStore.users.set('login-user-1', {
      _id: 'login-user-1',
      name: 'Login Citizen',
      email: 'login.citizen@cpet.org',
      passwordHash: 'hash',
      role: 'CITIZEN',
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      consent: { termsAccepted: true, termsVersion: '1.0', acceptedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await authService.requestOtp('login.citizen@cpet.org', 'LOGIN');

    const verifyRes = await request(app)
      .post('/api/v1/auth/email-otp/verify')
      .send({
        email: 'login.citizen@cpet.org',
        otp: capturedOtp,
        purpose: 'LOGIN',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.tokens.accessToken).toBeDefined();
    expect(verifyRes.body.data.tokens.refreshToken).toBeDefined();
    expect(verifyRes.body.data.user.email).toBe('login.citizen@cpet.org');
    expect(verifyRes.headers['set-cookie']).toBeDefined();
  });

  // 19. Organization Signup with OTP Verification
  it('19. Organization Signup Flow: valid OTP verification enables organization registration', async () => {
    await authService.requestOtp('admin@metro-utility.org', 'SIGNUP');
    await authService.verifyOtp('admin@metro-utility.org', capturedOtp, 'SIGNUP');

    const signupResult = await authService.registerOrganization({
      organizationName: 'Metro Utility Corp',
      organizationType: 'UTILITY',
      category: 'Power & Grid',
      adminName: 'Lead Admin',
      email: 'admin@metro-utility.org',
      password: 'SecureOrgPassword123!',
      contactPhone: '+1-555-0999',
      address: '100 Power Plaza',
      consent: { termsAccepted: true, termsVersion: '1.0' },
    });

    expect(signupResult.user.email).toBe('admin@metro-utility.org');
    expect(signupResult.user.role).toBe('ORGANIZATION_ADMIN');
    expect(signupResult.user.isEmailVerified).toBe(true);
    expect(signupResult.organizationId).toBeDefined();
    expect(signupResult.tokens.accessToken).toBeDefined();
    expect(signupResult.tokens.refreshToken).toBeDefined();

    // Verified OTP challenge must be consumed/deleted
    expect(memoryStore.otps.has('admin@metro-utility.org')).toBe(false);
  });

  // 20. Organization Cannot Bypass OTP
  it('20. Organization Cannot Bypass OTP: direct organization registration without OTP verification must fail', async () => {
    await expect(
      authService.registerOrganization({
        organizationName: 'Unverified Corp',
        organizationType: 'UTILITY',
        adminName: 'Sneaky Admin',
        email: 'unverified.org@cpet.org',
        password: 'SecurePassword123!',
        consent: { termsAccepted: true, termsVersion: '1.0' },
      })
    ).rejects.toThrow(/Email verification required/);
  });
});

