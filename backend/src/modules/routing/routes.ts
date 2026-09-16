import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate, authorize } from '../../middleware/auth.js';
import { routingService } from './routing.service.js';
import { DestinationModel, OrganizationModel } from '@cpet/database';
import { memoryStore } from '../../infrastructure/store.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';

export const routingRouter = Router();

/**
 * Deterministically evaluates routing for given criteria
 * POST /api/v1/routing/evaluate
 */
routingRouter.post(
  '/evaluate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decision = await routingService.evaluateRoute(req.body);
      res.status(200).json({
        success: true,
        data: decision,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Public Organization Directory listing with services, products, locations
 * GET /api/v1/organizations/directory
 */
routingRouter.get(
  '/directory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isDb = memoryStore.isDbConnected();
      const search = (req.query.search as string || '').toLowerCase();
      const city = (req.query.city as string || '').toLowerCase();
      const category = (req.query.category as string || '').toLowerCase();

      if (isDb) {
        const query: any = { status: 'VERIFIED', active: true };
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { brandName: { $regex: search, $options: 'i' } },
            { services: { $regex: search, $options: 'i' } },
            { products: { $regex: search, $options: 'i' } },
          ];
        }
        if (category) {
          query.serviceCategories = { $regex: category, $options: 'i' };
        }
        if (city) {
          query['locations.city'] = { $regex: city, $options: 'i' };
        }

        const orgs = await OrganizationModel.find(query).lean();
        return res.status(200).json({ success: true, data: orgs });
      } else {
        let orgs = Array.from(memoryStore.organizations.values()).filter(
          (o) => o.status === 'VERIFIED' && o.active !== false
        );
        if (search) {
          orgs = orgs.filter(
            (o) =>
              o.name.toLowerCase().includes(search) ||
              (o.brandName || '').toLowerCase().includes(search) ||
              o.services.some((s) => s.toLowerCase().includes(search)) ||
              o.products.some((p) => p.toLowerCase().includes(search))
          );
        }
        if (category) {
          orgs = orgs.filter((o) =>
            (o.serviceCategories || []).some((sc) => sc.toLowerCase().includes(category))
          );
        }
        if (city) {
          orgs = orgs.filter((o) => o.locations.some((l) => l.city.toLowerCase().includes(city)));
        }
        return res.status(200).json({ success: true, data: orgs });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * List configured destinations for an organization
 * GET /api/v1/organizations/:id/destinations
 */
routingRouter.get(
  '/:id/destinations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id;
      const user = (req as any).user;

      // Tenant isolation: staff can only view their own organization destinations
      if (user.role === 'ORGANIZATION_ADMIN' || user.role === 'ORGANIZATION_AGENT') {
        if (user.organizationId !== orgId) {
          throw new ForbiddenError('Tenant violation: Cannot view destinations of another organization');
        }
      }

      const isDb = memoryStore.isDbConnected();
      if (isDb) {
        const destinations = await DestinationModel.find({
          organizationId: new Types.ObjectId(orgId),
        }).lean();
        return res.status(200).json({ success: true, data: destinations });
      } else {
        const destinations = Array.from(memoryStore.destinations.values()).filter(
          (d) => d.organizationId === orgId
        );
        return res.status(200).json({ success: true, data: destinations });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Create a new destination for an organization
 * POST /api/v1/organizations/:id/destinations
 */
routingRouter.post(
  '/:id/destinations',
  authenticate,
  authorize('ORGANIZATION_ADMIN', 'SUPER_ADMIN', 'CPET_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id;
      const user = (req as any).user;

      if (user.role === 'ORGANIZATION_ADMIN' && user.organizationId !== orgId) {
        throw new ForbiddenError('Tenant violation: Cannot configure destinations for another organization');
      }

      const { type, value, departmentId, serviceCategory, source } = req.body;
      if (!type || !value) {
        throw new ValidationError('Destination type and value are required.');
      }

      const isDb = memoryStore.isDbConnected();
      if (isDb) {
        const dest = await DestinationModel.create({
          organizationId: new Types.ObjectId(orgId),
          departmentId,
          serviceCategory,
          type,
          value,
          source: source || 'MANUAL_ENTRY',
          verificationStatus: 'VERIFIED',
          verifiedDate: new Date(),
          activeStatus: true,
        });
        return res.status(201).json({ success: true, data: dest });
      } else {
        const _id = new Types.ObjectId().toString();
        const dest = {
          _id,
          organizationId: orgId,
          departmentId,
          serviceCategory,
          type,
          value,
          source: source || 'MANUAL_ENTRY',
          verificationStatus: 'VERIFIED' as const,
          verifiedDate: new Date(),
          activeStatus: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore.destinations.set(_id, dest);
        return res.status(201).json({ success: true, data: dest });
      }
    } catch (err) {
      next(err);
    }
  }
);
