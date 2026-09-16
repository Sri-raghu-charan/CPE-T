import { Router } from 'express';

export interface CpetModule {
  name: string;
  version: string;
  router?: Router;
  initialize?: () => Promise<void>;
}

export const registeredModules: string[] = [
  'auth',
  'users',
  'organizations',
  'cases',
  'requests',
  'complaints',
  'services',
  'blood',
  'ai',
  'schemas',
  'workflows',
  'routing',
  'communications',
  'notifications',
  'sla',
  'escalation',
  'directory',
  'attachments',
  'audit',
  'analytics',
  'integrations',
];
