import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { domainService } from './domain.service.js';
import { bloodService } from './blood.service.js';
import { authenticate } from '../../middleware/auth.js';
import { CaseType } from '@cpet/database';

export const domainRouter = Router();
export const bloodRouter = Router();

// ==========================================
// DOMAIN CONFIGURATION ENDPOINTS
// ==========================================

domainRouter.get('/', (_req: Request, res: Response) => {
  const configs = domainService.getAllDomainConfigs();
  return res.json({ success: true, data: configs });
});

domainRouter.get('/:type', (req: Request, res: Response) => {
  const type = req.params.type.toUpperCase() as CaseType;
  const config = domainService.getDomainConfig(type);
  if (!config) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Domain configuration for '${type}' not found.` },
    });
  }
  return res.json({ success: true, data: config });
});

// ==========================================
// BLOOD REQUIREMENT & DISCOVERY ENDPOINTS
// ==========================================

const registerDonorSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  approximateLocation: z.object({
    locality: z.string().optional(),
    municipality: z.string().optional(),
    subDistrict: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
  }),
  contactPreference: z.enum(['IN_APP', 'RELAY_SMS', 'ANONYMOUS_PROXY', 'PHONE']).default('IN_APP'),
  contactPhone: z.string().min(5, 'Valid contact phone is required'),
  contactEmail: z.string().email().optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'UNAVAILABLE', 'COOLDOWN']).default('AVAILABLE'),
});

const searchBloodSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  locality: z.string().optional(),
  municipality: z.string().optional(),
  subDistrict: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
  coordinates: z.string().optional(), // 'lon,lat'
});

const contactDonorSchema = z.object({
  anonymousDonorCode: z.string().min(3),
  caseId: z.string().optional(),
  hospitalName: z.string().min(2),
  unitsNeeded: z.coerce.number().min(1).default(1),
  urgency: z.string().default('CRITICAL_IMMEDIATE'),
  attendantPhone: z.string().min(5),
  message: z.string().optional(),
});

// 1. Search blood availability with 5-Level Geographic Hierarchy
bloodRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const validated = searchBloodSchema.parse(req.query);

    let parsedCoords: [number, number] | undefined;
    if (validated.coordinates) {
      const parts = validated.coordinates.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        parsedCoords = [parts[0], parts[1]];
      }
    }

    const discovery = await bloodService.searchBloodAvailability({
      bloodGroup: validated.bloodGroup,
      locality: validated.locality,
      municipality: validated.municipality,
      subDistrict: validated.subDistrict,
      district: validated.district,
      state: validated.state,
      radiusKm: validated.radiusKm,
      coordinates: parsedCoords,
    });

    return res.json({ success: true, data: discovery });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }
});

// 2. Register voluntary blood donor (authenticated)
bloodRouter.post('/donors/register', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = registerDonorSchema.parse(req.body);
    const result = await bloodService.registerDonor(validated, req.user?.userId);

    return res.status(201).json({
      success: true,
      message: 'Voluntary blood donor registration successful. Your privacy is protected with an anonymous donor ID.',
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }
});

// 3. Get authenticated user's donor profile
bloodRouter.get('/donors/me', authenticate, async (req: Request, res: Response) => {
  try {
    const profile = await bloodService.getDonorProfileByUserId(req.user!.userId);
    return res.json({ success: true, data: profile });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// 4. Update availability status
bloodRouter.put('/donors/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['AVAILABLE', 'UNAVAILABLE', 'COOLDOWN'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status must be AVAILABLE, UNAVAILABLE, or COOLDOWN' },
      });
    }

    const updated = await bloodService.updateDonorStatus(req.user!.userId, status);
    return res.json({ success: true, updated });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// 5. Safe contact / alert relay to donor
bloodRouter.post('/contact', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = contactDonorSchema.parse(req.body);
    const result = await bloodService.contactDonorRelay(validated, req.user!);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(err.status || 400).json({
      success: false,
      error: { code: err.code || 'VALIDATION_ERROR', message: err.message },
    });
  }
});
