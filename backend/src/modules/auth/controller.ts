import { Request, Response, NextFunction } from 'express';
import { authService } from './service.js';
import { env } from '../../config/env.js';
import { bruteForceProtector, logSecurityEvent } from '../../middleware/security.js';

export class AuthController {
  private setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = env.NODE_ENV === 'production';

    res.cookie('cpet_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('cpet_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  public registerCitizen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.registerCitizen(req.body);
      this.setCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public registerOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.registerOrganization(req.body);
      this.setCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const email = (req.body?.email || 'unknown').toLowerCase();
    const targetKey = `${req.ip || 'ip'}:${email}`;
    const lockStatus = bruteForceProtector.isLocked(targetKey);

    if (lockStatus.locked) {
      logSecurityEvent(
        'BRUTE_FORCE_LOCKOUT',
        { email, retryAfterSeconds: lockStatus.retryAfterSeconds },
        req
      );
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Account temporarily locked due to excessive failed attempts. Please retry after ${lockStatus.retryAfterSeconds} seconds.`,
        },
      });
      return;
    }

    try {
      const userAgent = req.headers['user-agent'];
      const ip = req.ip;
      const result = await authService.login(req.body.email, req.body.password, userAgent, ip);
      bruteForceProtector.recordSuccess(targetKey);
      this.setCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      bruteForceProtector.recordFailure(targetKey);
      next(error);
    }
  };

  public requestOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const destination = (req.body.email || req.body.target || '').toLowerCase().trim();
    const purpose = req.body.purpose;
    logSecurityEvent('OTP_REQUESTED', { destination, purpose }, req);

    try {
      const result = await authService.requestOtp(destination, purpose);
      logSecurityEvent('OTP_SENT', { destination, purpose }, req);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  public resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const destination = (req.body.email || req.body.target || '').toLowerCase().trim();
    const purpose = req.body.purpose;
    logSecurityEvent('OTP_RESEND', { destination, purpose }, req);

    try {
      const result = await authService.resendOtp(destination, purpose);
      logSecurityEvent('OTP_SENT', { destination, purpose }, req);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const destination = (req.body.email || req.body.target || '').toLowerCase().trim();
    const purpose = req.body.purpose;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    try {
      const result = await authService.verifyOtp(destination, req.body.otp, purpose, userAgent, ip);
      logSecurityEvent('OTP_VERIFICATION_SUCCESS', { destination, purpose }, req);

      if (result.tokens) {
        this.setCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.user ? { user: result.user, tokens: result.tokens } : undefined,
      });
    } catch (error: any) {
      logSecurityEvent('OTP_VERIFICATION_FAILED', { destination, purpose, reason: error?.message }, req);
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.body?.refreshToken || req.cookies?.cpet_refresh_token;
      if (!refreshToken) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Refresh token missing' } });
        return;
      }

      const userAgent = req.headers['user-agent'];
      const ip = req.ip;
      const tokens = await authService.refreshTokens(refreshToken, userAgent, ip);
      this.setCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.body?.refreshToken || req.cookies?.cpet_refresh_token;
      await authService.logout(refreshToken);

      res.clearCookie('cpet_token');
      res.clearCookie('cpet_refresh_token', { path: '/api/v1/auth/refresh' });

      res.status(200).json({
        success: true,
        message: 'Signed out successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
