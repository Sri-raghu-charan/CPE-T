import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { UserModel, OrganizationModel } from '@cpet/database';
import { NotFoundError } from '../../utils/errors.js';
import { memoryStore } from '../../infrastructure/store.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

/**
 * Get currently authenticated user profile
 */
usersRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let user: any;
    let organization: any = null;

    if (memoryStore.isDbConnected()) {
      user = await UserModel.findById(req.user!.userId).lean();
      if (!user) {
        throw new NotFoundError('User profile not found.');
      }
      if (user.organizationId) {
        organization = await OrganizationModel.findById(user.organizationId).lean();
      }
    } else {
      user = memoryStore.users.get(req.user!.userId);
      if (!user) {
        throw new NotFoundError('User profile not found.');
      }
      if (user.organizationId) {
        organization = memoryStore.organizations.get(user.organizationId);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId.toString() : null,
        organization,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        consent: user.consent,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update personal profile
 */
usersRouter.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone } = req.body;

    let user: any;
    if (memoryStore.isDbConnected()) {
      user = await UserModel.findById(req.user!.userId);
      if (!user) {
        throw new NotFoundError('User profile not found.');
      }
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      await user.save();
    } else {
      user = memoryStore.users.get(req.user!.userId);
      if (!user) {
        throw new NotFoundError('User profile not found.');
      }
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      user.updatedAt = new Date();
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
});
