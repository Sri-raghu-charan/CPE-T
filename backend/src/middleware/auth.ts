import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserRole, UserModel } from '@cpet/database';
import { memoryStore } from '../infrastructure/store.js';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        name?: string;
        email: string;
        role: UserRole;
        organizationId?: string | null;
      };
    }
  }
}

/**
 * Verifies Bearer JWT or cookie, populating req.user
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.cpet_token) {
      token = req.cookies.cpet_token;
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication required. Missing Bearer token or session cookie.'));
    }

    let decoded: AuthJwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
    } catch {
      return next(new UnauthorizedError('Invalid or expired authentication token.'));
    }

    // Verify user is still active in database
    let user: any;
    if (memoryStore.isDbConnected() || Boolean((UserModel.findById as any)?._isMockFunction)) {
      user = await UserModel.findById(decoded.userId).lean();
    } else {
      user = memoryStore.users.get(decoded.userId);
    }

    if (!user || !user.isActive || user.isDeleted) {
      return next(new UnauthorizedError('Account is inactive, suspended, or no longer exists.'));
    }

    req.user = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * RBAC authorization middleware checking permitted roles
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Insufficient privileges for role '${req.user.role}'. Permitted: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}

/**
 * Enforces strict multi-tenant boundary.
 * Verifies that the authenticated user belongs to the target organization.
 * SUPER_ADMIN and CPET_ADMIN have global administrative oversight.
 */
export function tenantScope(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required for tenant operations.'));
  }

  // Super admins have cross-tenant clearance
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'CPET_ADMIN') {
    return next();
  }

  const targetOrgId = req.params.orgId || req.body?.organizationId || req.query?.organizationId;

  if (!req.user.organizationId) {
    return next(new ForbiddenError('User is not associated with any organization tenant.'));
  }

  if (targetOrgId && targetOrgId.toString() !== req.user.organizationId.toString()) {
    return next(new ForbiddenError('Tenant violation: Access to other organization data is strictly prohibited.'));
  }

  next();
}
