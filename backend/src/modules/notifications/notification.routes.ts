import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../../middleware/auth.js';
import { NotificationModel } from '@cpet/database';
import { memoryStore } from '../../infrastructure/store.js';

export const notificationsRouter = Router();

/**
 * GET /api/v1/notifications
 * Retrieves notifications for the authenticated user.
 */
notificationsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      const notifications = await NotificationModel.find({
        $or: [
          { recipientUserId: new Types.ObjectId(userId) },
          { recipientOrgId: req.user!.organizationId ? new Types.ObjectId(req.user!.organizationId) : undefined },
        ].filter(Boolean),
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      res.status(200).json({ success: true, data: notifications });
    } else {
      let notifications = Array.from(memoryStore.notifications.values()).filter((n) => {
        const matchesUser = n.recipientUserId && n.recipientUserId.toString() === userId.toString();
        const matchesOrg = req.user!.organizationId && n.recipientOrgId && n.recipientOrgId.toString() === req.user!.organizationId.toString();
        return matchesUser || matchesOrg;
      });

      // If no personalized notifications exist in memory store, provide default recent system alerts
      if (notifications.length === 0) {
        notifications = [
          {
            _id: 'notif-default-1',
            recipientUserId: userId,
            type: 'STATUS_UPDATE',
            title: 'Welcome to CPET Escalation Portal',
            message: 'Your citizen identity and secure session are fully verified. You can submit complaints and track live updates.',
            isRead: false,
            channel: 'SMS',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          {
            _id: 'notif-default-2',
            recipientUserId: userId,
            type: 'SLA_ALERT',
            title: 'SLA Tracking Active',
            message: 'All submitted requests are bound by strict statutory resolution windows and automated escalation.',
            isRead: true,
            channel: 'SMS',
            createdAt: new Date(Date.now() - 3600000),
            updatedAt: new Date(Date.now() - 3600000),
          } as any,
        ];
      }

      res.status(200).json({ success: true, data: notifications });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a notification as read.
 */
notificationsRouter.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isDb = memoryStore.isDbConnected();

    if (isDb && Types.ObjectId.isValid(id)) {
      await NotificationModel.findByIdAndUpdate(id, { $set: { isRead: true, readAt: new Date() } });
    } else {
      const notif = memoryStore.notifications.get(id);
      if (notif) {
        notif.isRead = true;
        notif.readAt = new Date();
        memoryStore.notifications.set(id, notif);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { id, isRead: true },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/notifications/test-sms
 * Simulates real-time SMS status alert dispatch to citizen phone.
 */
notificationsRouter.post('/test-sms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, caseReference, status, orgName } = req.body;
    const cleanPhone = phone || '+91 94940 12345';
    const cleanRef = caseReference || 'CPET-2026-LIVE';
    const cleanStatus = status || 'IN_PROGRESS';
    const cleanOrg = orgName || 'Assigned Authority';

    const smsText = `[CPET Alert] Case ${cleanRef} with ${cleanOrg} is now ${cleanStatus}. SLA timeline active.`;

    res.status(200).json({
      success: true,
      data: {
        status: 'SENT',
        delivered: true,
        phone: cleanPhone,
        smsText,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});
