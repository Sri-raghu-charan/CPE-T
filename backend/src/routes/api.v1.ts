import { Router } from 'express';
import { registeredModules } from '../modules/index.js';
import { authRouter } from '../modules/auth/routes.js';
import { organizationsRouter } from '../modules/organizations/routes.js';
import { usersRouter } from '../modules/users/routes.js';
import { caseRouter } from '../modules/cases/routes.js';
import { aiRouter } from '../modules/ai/routes.js';
import { routingRouter } from '../modules/routing/routes.js';
import { domainRouter, bloodRouter } from '../modules/domains/domain.routes.js';
import { slaRouter } from '../modules/sla/sla.routes.js';
import {
  authRateLimiter,
  aiRateLimiter,
  publicSearchRateLimiter,
} from '../middleware/rateLimiter.js';
import { fastCache } from '../middleware/fastCache.js';

export const apiV1Router = Router();

apiV1Router.get('/', (_req, res) => {
  res.status(200).json({
    version: 'v1',
    description: 'CPET API v1',
    modules: registeredModules,
  });
});

// Mounted modules with layered rate limiting and caching
apiV1Router.use('/auth', authRateLimiter, authRouter);
apiV1Router.use('/organizations', organizationsRouter);
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/cases', caseRouter);
apiV1Router.use('/ai', aiRateLimiter, aiRouter);
apiV1Router.use('/routing', publicSearchRateLimiter, routingRouter);
apiV1Router.use('/domains', fastCache(60), domainRouter);
apiV1Router.use('/blood', bloodRouter);
apiV1Router.use('/sla', slaRouter);

