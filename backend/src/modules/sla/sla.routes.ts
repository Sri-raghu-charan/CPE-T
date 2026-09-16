import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { slaService } from './sla.service.js';
import { escalationService } from '../escalation/escalation.service.js';
import { escalationQueueService } from '../escalation/escalation.queue.js';
import { caseService } from '../cases/case.service.js';
import { memoryStore } from '../../infrastructure/store.js';
import { SlaPolicyModel } from '@cpet/database';

export const slaRouter = Router();

/**
 * GET /api/v1/sla/policies
 * Returns active SLA policies
 */
slaRouter.get('/policies', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let policies: any[] = [];
    if (memoryStore.isDbConnected()) {
      policies = await SlaPolicyModel.find({ active: true }).lean();
    } else {
      policies = Array.from(memoryStore.slaPolicies.values());
    }

    res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sla/cases/:id/evaluate
 * Evaluates real-time SLA status, milestones, and countdown for a case
 */
slaRouter.get('/cases/:id/evaluate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const details = await caseService.getCaseDetails(req.params.id, {
      _id: req.user!.userId,
      role: req.user!.role,
      organizationId: req.user!.organizationId,
    });
    const caseItem = details.case;
    const evaluation = slaService.evaluateCaseSla(caseItem);

    res.status(200).json({
      success: true,
      data: {
        caseId: req.params.id,
        referenceNumber: caseItem.referenceNumber,
        sla: caseItem.sla,
        evaluation,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/sla/cases/:id/escalate
 * Triggers escalation (manual supervisor or manual override)
 */
slaRouter.post('/cases/:id/escalate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = req.body?.reason || 'Supervisor manual escalation';
    const escalatedCase = await escalationService.executeEscalation(
      req.params.id,
      reason,
      'MANUAL_SUPERVISOR',
      req.user ? { _id: req.user.userId, name: req.user.name || 'Supervisor', role: req.user.role } : undefined
    );

    res.status(200).json({
      success: true,
      message: 'Case escalated successfully',
      data: escalatedCase,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/sla/sweep
 * Triggers an immediate escalation sweep across all open cases (Admin/Operations)
 */
slaRouter.post(
  '/sweep',
  authenticate,
  authorize('ORGANIZATION_ADMIN', 'SUPER_ADMIN', 'CPET_ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await escalationQueueService.runImmediateSweep();
      res.status(200).json({
        success: true,
        message: `Escalation sweep completed: ${result.escalatedCount} cases escalated out of ${result.evaluatedCount} evaluated.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
