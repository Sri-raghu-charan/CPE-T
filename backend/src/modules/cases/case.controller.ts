import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { caseService } from './case.service.js';
import {
  createCaseSchema,
  transitionCaseSchema,
  assignAgentSchema,
  addMessageSchema,
} from './types.js';

export class CaseController {
  /**
   * POST /api/v1/cases
   * Citizen creates a new case.
   */
  public async createCase(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createCaseSchema.parse(req.body);
      const user = req.user!;
      const createdCase = await caseService.createCase(validated, {
        _id: user.userId,
        name: user.name || 'Citizen',
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        message: 'Case successfully created and submitted',
        data: createdCase,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/cases/my
   * Citizen retrieves their cases.
   */
  public async getMyCases(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const tab = req.query.tab as any;
      const search = req.query.search as string;

      const cases = await caseService.getCasesForCitizen(user.userId, { tab, search });

      res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/cases/organization/:orgId
   * Organization staff retrieves cases for their tenant.
   */
  public async getOrganizationCases(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;
      const status = req.query.status as string;
      const priority = req.query.priority as string;
      const search = req.query.search as string;

      const cases = await caseService.getCasesForOrganization(orgId, {
        status,
        priority,
        search,
      });

      res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/cases/:id
   * Retrieves single case details, timeline, and allowed transitions.
   */
  public async getCaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const caseDetails = await caseService.getCaseDetails(id, {
        _id: user.userId,
        role: user.role,
        organizationId: user.organizationId,
      });

      res.status(200).json({
        success: true,
        data: caseDetails,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/cases/:id/transition
   * Transitions status through the state machine with audit event.
   */
  public async transitionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = transitionCaseSchema.parse(req.body);
      const user = req.user!;

      const result = await caseService.transitionStatus(id, validated, {
        _id: user.userId,
        name: user.name || 'User',
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      });

      res.status(200).json({
        success: true,
        message: `Case status transitioned to '${validated.targetStatus}'`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/cases/:id/assign
   * Assigns an agent to the case.
   */
  public async assignAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = assignAgentSchema.parse(req.body);
      const user = req.user!;

      const result = await caseService.assignAgent(id, validated, {
        _id: user.userId,
        name: user.name || 'Admin',
        role: user.role,
        organizationId: user.organizationId,
      });

      res.status(200).json({
        success: true,
        message: 'Agent assigned successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/cases/:id/messages
   * Posts a public message or internal note to the case.
   */
  public async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = addMessageSchema.parse(req.body);
      const user = req.user!;

      const result = await caseService.addMessage(id, validated, {
        _id: user.userId,
        name: user.name || 'Participant',
        role: user.role,
        organizationId: user.organizationId,
      });

      res.status(201).json({
        success: true,
        message: 'Message added to timeline',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/cases/:id/read
   * Marks all messages on a case as read by the authenticated user.
   */
  public async markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const result = await caseService.markMessagesAsRead(id, {
        _id: user.userId,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/cases/:id/feedback
   * Submits citizen rating and comments on a resolved/closed case.
   */
  public async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const schema = z.object({
        rating: z.number().min(1).max(5),
        comments: z.string().max(1000).optional(),
      });
      const validated = schema.parse(req.body);

      const result = await caseService.submitFeedback(id, validated, {
        _id: user.userId,
        name: user.name || 'Citizen',
        role: user.role,
      });

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const caseController = new CaseController();
