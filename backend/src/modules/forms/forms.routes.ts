import { Router, Request, Response, NextFunction } from 'express';
import { formsService } from './forms.service.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const formsRouter = Router();

/**
 * GET /api/v1/forms/public
 * Public directory of published online forms.
 */
formsRouter.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, type } = req.query;
    const forms = await formsService.getPublicForms({
      category: category as string,
      search: search as string,
      type: type as string,
    });
    res.status(200).json({ success: true, data: forms });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/forms
 * List forms with optional filtering (tenant / public).
 */
formsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, isPublic, status, category, search, type } = req.query;
    const forms = await formsService.getForms({
      organizationId: organizationId as string,
      isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
      status: status as string,
      category: category as string,
      search: search as string,
      type: type as any,
    });
    res.status(200).json({ success: true, data: forms });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/forms/:idOrSlug
 * Retrieve single form definition by ID or slug.
 */
formsRouter.get('/:idOrSlug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await formsService.getFormByIdOrSlug(req.params.idOrSlug);
    res.status(200).json({ success: true, data: form });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/forms
 * Create a new Dynamic Form (Staff or Platform Admin).
 */
formsRouter.post(
  '/',
  authenticate,
  authorize('ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'SUPER_ADMIN', 'CPET_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await formsService.createForm(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: 'Form created and published successfully',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/forms/:id
 * Update an existing Dynamic Form.
 */
formsRouter.put(
  '/:id',
  authenticate,
  authorize('ORGANIZATION_ADMIN', 'SUPER_ADMIN', 'CPET_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await formsService.updateForm(req.params.id, req.body, req.user!);
      res.status(200).json({
        success: true,
        message: 'Form updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/forms/:id
 * Delete or archive an existing Dynamic Form.
 */
formsRouter.delete(
  '/:id',
  authenticate,
  authorize('ORGANIZATION_ADMIN', 'SUPER_ADMIN', 'CPET_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await formsService.deleteForm(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Form deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/forms/:idOrSlug/submit
 * Public or authenticated submission of a dynamic form.
 * Generates an immutable Case with tracking reference number.
 */
formsRouter.post('/:idOrSlug/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if optional auth header is present
    const authHeader = req.headers.authorization;
    let authUser: any = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const { env } = await import('../../config/env.js');
        const decoded = jwt.default.verify(token, env.JWT_SECRET) as any;
        if (decoded?.userId) {
          authUser = {
            userId: decoded.userId,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role,
          };
        }
      } catch {
        // Optional auth: continue as anonymous citizen if token is invalid
      }
    }

    const result = await formsService.submitForm(req.params.idOrSlug, req.body, authUser);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/forms/:id/submissions
 * Organization staff retrieves submissions for their form.
 */
formsRouter.get(
  '/:id/submissions',
  authenticate,
  authorize('ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'SUPER_ADMIN', 'CPET_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submissions = await formsService.getFormSubmissions(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: submissions,
      });
    } catch (err) {
      next(err);
    }
  }
);
