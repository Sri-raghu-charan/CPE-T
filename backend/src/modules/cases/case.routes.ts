import { Router } from 'express';
import { authenticate, authorize, tenantScope } from '../../middleware/auth.js';
import { caseController } from './case.controller.js';

export const caseRouter = Router();

// All case routes require authentication
caseRouter.use(authenticate);

/**
 * POST /api/v1/cases
 * Raise a new Universal Case (Service Request, Complaint, Grievance, Blood Request, etc.)
 */
caseRouter.post(
  '/',
  authorize('CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN'),
  caseController.createCase
);

/**
 * GET /api/v1/cases/my
 * Citizen views their own cases (tabbed by active, pending, resolved, closed)
 */
caseRouter.get(
  '/my',
  authorize('CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN'),
  caseController.getMyCases
);

/**
 * GET /api/v1/cases/organization/:orgId
 * Organization staff views tenant-isolated case queue
 */
caseRouter.get(
  '/organization/:orgId',
  authorize('ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'),
  tenantScope,
  caseController.getOrganizationCases
);

/**
 * GET /api/v1/cases/:id
 * Retrieve case details, full audit timeline, and contextual allowed transitions
 */
caseRouter.get('/:id', caseController.getCaseById);

/**
 * POST /api/v1/cases/:id/transition
 * Transition case status through the State Machine
 */
caseRouter.post('/:id/transition', caseController.transitionStatus);

/**
 * POST /api/v1/cases/:id/assign
 * Assign an internal organization agent to the case
 */
caseRouter.post(
  '/:id/assign',
  authorize('ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN'),
  caseController.assignAgent
);

/**
 * POST /api/v1/cases/:id/messages
 * Add a public response or internal team note to the case timeline
 */
caseRouter.post('/:id/messages', caseController.addMessage);

/**
 * POST /api/v1/cases/:id/read
 * Mark case messages as read
 */
caseRouter.post('/:id/read', caseController.markMessagesAsRead);

/**
 * POST /api/v1/cases/:id/feedback
 * Submit citizen satisfaction rating & feedback on resolved/closed case
 */
caseRouter.post(
  '/:id/feedback',
  authorize('CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN'),
  caseController.submitFeedback
);
