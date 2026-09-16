import { Router } from 'express';
import { authController } from './controller.js';
import { validate } from '../../middleware/validate.js';
import {
  citizenSignupSchema,
  orgSignupSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshTokenSchema,
} from './schemas.js';

export const authRouter = Router();

authRouter.post('/citizen/signup', validate(citizenSignupSchema), authController.registerCitizen);
authRouter.post('/organization/signup', validate(orgSignupSchema), authController.registerOrganization);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/otp/request', validate(otpRequestSchema), authController.requestOtp);
authRouter.post('/otp/verify', validate(otpVerifySchema), authController.verifyOtp);
authRouter.post('/refresh', validate(refreshTokenSchema), authController.refresh);
authRouter.post('/logout', authController.logout);
