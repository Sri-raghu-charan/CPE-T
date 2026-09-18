import { z } from 'zod';

export const citizenSignupSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email address required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
    consent: z.object({
      termsAccepted: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the terms of service and privacy policy' }),
      }),
      termsVersion: z.string().default('1.0'),
    }),
  }),
};

export const orgSignupSchema = {
  body: z.object({
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
    organizationType: z.enum([
      'MUNICIPAL',
      'UTILITY',
      'HEALTHCARE',
      'CONSUMER_GOODS',
      'TRANSPORT',
      'GOVERNMENT',
      'OTHER',
    ]),
    category: z.string().default('General'),
    adminName: z.string().min(2, 'Administrator name is required'),
    email: z.string().email('Valid corporate/work email required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    consent: z.object({
      termsAccepted: z.literal(true, {
        errorMap: () => ({ message: 'Organization consent required' }),
      }),
      termsVersion: z.string().default('1.0'),
    }),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password is required'),
  }),
};

export const otpPurposeEnum = z.enum([
  'SIGNUP',
  'LOGIN',
  'PASSWORD_RESET',
  'PHONE_VERIFICATION',
  'EMAIL_VERIFICATION',
]);

export const otpRequestSchema = {
  body: z
    .object({
      target: z.string().optional(),
      email: z.string().email('Valid email required').optional(),
      purpose: otpPurposeEnum,
    })
    .refine((data) => Boolean(data.target || data.email), {
      message: 'Email or target is required',
      path: ['target'],
    }),
};

export const otpVerifySchema = {
  body: z
    .object({
      target: z.string().optional(),
      email: z.string().email('Valid email required').optional(),
      otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
      purpose: otpPurposeEnum,
    })
    .refine((data) => Boolean(data.target || data.email), {
      message: 'Email or target is required',
      path: ['target'],
    }),
};

export const otpResendSchema = {
  body: z
    .object({
      target: z.string().optional(),
      email: z.string().email('Valid email required').optional(),
      purpose: otpPurposeEnum,
    })
    .refine((data) => Boolean(data.target || data.email), {
      message: 'Email or target is required',
      path: ['target'],
    }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().optional(),
  }),
};

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
  }),
};
