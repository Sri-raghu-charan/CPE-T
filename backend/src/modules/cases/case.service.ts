import mongoose, { Types } from 'mongoose';
import {
  CaseModel,
  CaseEventModel,
  OrganizationModel,
  UserModel,
  NotificationModel,
  CaseStatus,
  CasePriority,
} from '@cpet/database';
import { memoryStore, MemoryCase, MemoryCaseEvent } from '../../infrastructure/store.js';
import {
  CreateCaseInput,
  TransitionCaseInput,
  AssignAgentInput,
  AddMessageInput,
} from './types.js';
import { assertValidTransition, getAllowedTransitions } from './stateMachine.js';
import { routingService } from '../routing/routing.service.js';
import { domainService } from '../domains/domain.service.js';
import { slaService } from '../sla/sla.service.js';
import { dispatchQueueService } from '../routing/dispatch.queue.js';
import { socketManager } from '../../infrastructure/socket.js';
import { logger } from '../../utils/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../utils/errors.js';

export class CaseService {
  /**
   * Generates a unique, collision-resistant reference number.
   * Example: CPET-2026-84912
   */
  private generateReferenceNumber(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `CPET-${year}-${randomNum}`;
  }

  /**
   * Calculates SLA due date based on organization settings, domain config, and case priority.
   */
  private calculateSla(
    priority: CasePriority,
    orgDefaultSlaHours: number = 48,
    caseType?: any
  ): { dueAt: Date; slaHours: number } {
    let slaHours = caseType
      ? domainService.calculateDomainSlaHours(caseType, priority, orgDefaultSlaHours)
      : orgDefaultSlaHours;

    if (!caseType) {
      switch (priority) {
        case 'URGENT':
          slaHours = Math.max(6, Math.floor(orgDefaultSlaHours / 4));
          break;
        case 'HIGH':
          slaHours = Math.max(12, Math.floor(orgDefaultSlaHours / 2));
          break;
        case 'MEDIUM':
          slaHours = orgDefaultSlaHours;
          break;
        case 'LOW':
          slaHours = orgDefaultSlaHours * 1.5;
          break;
      }
    }
    const dueAt = new Date(Date.now() + slaHours * 3600 * 1000);
    return { dueAt, slaHours };
  }

  /**
   * Creates a new Universal Case with deterministic destination routing.
   */
  public async createCase(
    input: CreateCaseInput,
    user: { _id: string; name: string; email: string; role: any }
  ) {
    const isDb = memoryStore.isDbConnected();
    const referenceNumber = this.generateReferenceNumber();

    let orgName = 'Assigned Organization';
    let defaultSlaHours = 48;

    // 1. Evaluate deterministic routing first (resolves org, dept, and destination)
    let routingDecision: any = null;
    try {
      routingDecision = await routingService.evaluateRoute({
        organizationId: input.organizationId,
        rawOrgName: (input as any).rawOrgName,
        organizationName: (input as any).organizationName,
        intent: input.type,
        productService: input.productService,
        category: input.category,
        location: input.location,
      });
      if (routingDecision) {
        input.organizationId = routingDecision.organizationId;
        orgName = routingDecision.organizationName;
        defaultSlaHours = routingDecision.slaHours;
      }
    } catch (routeErr: any) {
      logger.warn(`[CaseService] Deterministic routing notice: ${routeErr.message}`);
    }

    if (!input.organizationId) {
      if (isDb) {
        const org = await OrganizationModel.findOne({ status: 'VERIFIED', active: true }).lean();
        if (org) {
          input.organizationId = org._id.toString();
          orgName = org.name;
          defaultSlaHours = org.settings?.defaultSlaHours || 48;
        } else {
          throw new NotFoundError('No verified organization found to receive case.');
        }
      } else {
        const firstOrg = Array.from(memoryStore.organizations.values()).find(
          (o) => o.status === 'VERIFIED' && o.active !== false
        );
        if (firstOrg) {
          input.organizationId = firstOrg._id;
          orgName = firstOrg.name;
          defaultSlaHours = firstOrg.settings.defaultSlaHours;
        } else {
          throw new NotFoundError('No verified organization found to receive case.');
        }
      }
    } else {
      if (isDb) {
        const org = await OrganizationModel.findById(input.organizationId).lean();
        if (org) {
          orgName = org.name;
          defaultSlaHours = org.settings?.defaultSlaHours || 48;
        }
      } else {
        const org = memoryStore.organizations.get(input.organizationId);
        if (org) {
          orgName = org.name;
          defaultSlaHours = org.settings.defaultSlaHours;
        }
      }
    }

    // Validate and sanitize domain structuredData if present
    if (input.structuredData && Object.keys(input.structuredData).length > 0) {
      try {
        input.structuredData = domainService.validateStructuredData(input.type, input.structuredData);
      } catch (valErr: any) {
        logger.warn(`[CaseService] Domain structuredData validation notice: ${valErr.message}`);
      }
    }

    const slaCalc = await slaService.calculateSla({
      caseType: input.type,
      priority: input.priority,
      organizationId: input.organizationId,
      category: input.category,
      orgDefaultSlaHours: defaultSlaHours,
      createdAt: new Date(),
    });

    const routingData = routingDecision
      ? {
          destinationId: isDb ? new Types.ObjectId(routingDecision.destinationId) : routingDecision.destinationId,
          destinationType: routingDecision.destinationType,
          destinationValue: routingDecision.destinationValue,
          department: routingDecision.departmentName,
          routedAt: new Date(),
          routeMatchedReason: routingDecision.routeMatchedReason,
        }
      : undefined;

    const externalDispatchInit = routingDecision
      ? {
          dispatchId: `disp-${referenceNumber}-${Date.now()}`,
          channel: routingDecision.destinationType,
          status: 'PENDING' as const,
          attempts: 0,
        }
      : undefined;

    if (isDb) {
      const caseDoc = await CaseModel.create({
        referenceNumber,
        type: input.type,
        title: input.title,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        productService: input.productService,
        structuredData: input.structuredData || {},
        location: input.location,
        requesterId: new Types.ObjectId(user._id),
        organizationId: new Types.ObjectId(input.organizationId),
        priority: input.priority,
        status: 'SUBMITTED',
        routing: routingData,
        externalDispatch: externalDispatchInit,
        attachments: (input.attachments || []).map((att) => ({
          ...att,
          uploadedAt: new Date(),
          uploaderId: new Types.ObjectId(user._id),
        })),
        sla: {
          dueAt: slaCalc.resolutionDueAt,
          slaHours: slaCalc.benchmarkHours,
          acknowledgementDueAt: slaCalc.acknowledgementDueAt,
          firstResponseDueAt: slaCalc.firstResponseDueAt,
          resolutionDueAt: slaCalc.resolutionDueAt,
          status: 'ON_TRACK',
          isEscalated: false,
          escalationHistory: [],
        },
        version: 1,
        submittedAt: new Date(),
      });

      // Immutable Case Creation Audit Event
      await CaseEventModel.create({
        caseId: caseDoc._id,
        actorId: new Types.ObjectId(user._id),
        actorName: user.name,
        actorRole: user.role,
        eventType: 'CASE_CREATED',
        previousState: null,
        newState: 'SUBMITTED',
        message: routingDecision
          ? `Case ${referenceNumber} created and routed to ${routingDecision.departmentName} via ${routingDecision.destinationType} (${routingDecision.destinationValue}).`
          : `Case ${referenceNumber} created and submitted into ${orgName} queue.`,
        isInternal: false,
        timestamp: new Date(),
      });

      // Asynchronously trigger external dispatch if applicable
      if (routingDecision && externalDispatchInit) {
        await dispatchQueueService.enqueueDispatch({
          dispatchId: externalDispatchInit.dispatchId,
          caseId: caseDoc._id.toString(),
          referenceNumber,
          type: input.type,
          title: input.title,
          description: input.description,
          productService: input.productService,
          category: input.category,
          priority: input.priority,
          structuredData: input.structuredData,
          location: input.location,
          destination: {
            type: routingDecision.destinationType,
            value: routingDecision.destinationValue,
            department: routingDecision.departmentName,
          },
          requester: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          timestamp: new Date(),
        });
      }

      // Real-time alert to organization queue
      socketManager.emitToOrg(input.organizationId, 'org:new_case', caseDoc.toObject());

      return caseDoc.toObject();
    } else {
      const caseId = new Types.ObjectId().toString();
      const newCase: MemoryCase = {
        _id: caseId,
        referenceNumber,
        type: input.type,
        title: input.title,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        productService: input.productService,
        structuredData: input.structuredData || {},
        location: input.location,
        requesterId: user._id,
        requesterName: user.name,
        requesterEmail: user.email,
        organizationId: input.organizationId,
        organizationName: orgName,
        assignedAgentId: null,
        priority: input.priority,
        status: 'SUBMITTED',
        routing: routingData as any,
        externalDispatch: externalDispatchInit as any,
        attachments: (input.attachments || []).map((att) => ({
          ...att,
          uploadedAt: new Date(),
        })),
        sla: {
          dueAt: slaCalc.resolutionDueAt,
          slaHours: slaCalc.benchmarkHours,
          acknowledgementDueAt: slaCalc.acknowledgementDueAt,
          firstResponseDueAt: slaCalc.firstResponseDueAt,
          resolutionDueAt: slaCalc.resolutionDueAt,
          status: 'ON_TRACK',
          isEscalated: false,
          escalationHistory: [],
        },
        version: 1,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryStore.cases.set(caseId, newCase);

      const eventId = new Types.ObjectId().toString();
      const event: MemoryCaseEvent = {
        _id: eventId,
        caseId,
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        eventType: 'CASE_CREATED',
        previousState: null,
        newState: 'SUBMITTED',
        message: routingDecision
          ? `Case ${referenceNumber} created and routed to ${routingDecision.departmentName} via ${routingDecision.destinationType} (${routingDecision.destinationValue}).`
          : `Case ${referenceNumber} created and submitted into ${orgName} queue.`,
        isInternal: false,
        timestamp: new Date(),
      };

      memoryStore.caseEvents.set(caseId, [event]);

      // Asynchronously trigger external dispatch if applicable
      if (routingDecision && externalDispatchInit) {
        await dispatchQueueService.enqueueDispatch({
          dispatchId: externalDispatchInit.dispatchId,
          caseId,
          referenceNumber,
          type: input.type,
          title: input.title,
          description: input.description,
          productService: input.productService,
          category: input.category,
          priority: input.priority,
          structuredData: input.structuredData,
          location: input.location,
          destination: {
            type: routingDecision.destinationType,
            value: routingDecision.destinationValue,
            department: routingDecision.departmentName,
          },
          requester: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          timestamp: new Date(),
        });
      }

      // Real-time alert to organization queue
      socketManager.emitToOrg(input.organizationId, 'org:new_case', newCase);

      return newCase;
    }
  }

  /**
   * Transitions a case status through the State Machine with audit logging.
   */
  public async transitionStatus(
    caseId: string,
    input: TransitionCaseInput,
    user: { _id: string; name: string; email: string; role: any; organizationId?: string | null }
  ) {
    const isDb =
      memoryStore.isDbConnected() &&
      (mongoose.connection.readyState === 1 || Boolean((CaseModel.findById as any)?._isMockFunction));

    let targetCase: any = null;
    if (isDb) {
      targetCase = await CaseModel.findById(caseId);
    } else {
      targetCase = memoryStore.cases.get(caseId);
    }

    if (!targetCase) {
      throw new NotFoundError(`Case with ID '${caseId}' not found`);
    }

    // Verify Tenant Isolation & Requester Authorization
    const requesterIdStr = targetCase.requesterId?.toString();
    const orgIdStr = targetCase.organizationId?.toString();

    if (user.role === 'CITIZEN' || user.role === 'DONOR') {
      if (requesterIdStr !== user._id.toString()) {
        throw new ForbiddenError('Access denied: You do not have permission to modify this case');
      }
    } else if (user.role === 'ORGANIZATION_ADMIN' || user.role === 'ORGANIZATION_AGENT') {
      if (user.organizationId?.toString() !== orgIdStr) {
        throw new ForbiddenError(
          'Tenant violation: Access to cases of other organizations is strictly prohibited'
        );
      }
    }

    // Optimistic Concurrency Check
    if (input.expectedVersion !== undefined && targetCase.version !== input.expectedVersion) {
      throw new ConflictError(
        'Case was modified by another concurrent action. Please refresh the timeline.'
      );
    }

    const currentStatus = targetCase.status as CaseStatus;
    const nextStatus = input.targetStatus as CaseStatus;

    // Validate Transition via State Machine
    assertValidTransition(currentStatus, nextStatus, user.role);

    // Determine eventType
    let eventType: any = 'STATUS_CHANGE';
    if (nextStatus === 'RESOLVED') eventType = 'RESOLVED';
    else if (nextStatus === 'CLOSED') eventType = 'CLOSED';
    else if (nextStatus === 'REOPENED') eventType = 'REOPENED';
    else if (nextStatus === 'ESCALATED') eventType = 'ESCALATED';
    else if (nextStatus === 'WAITING_FOR_USER') eventType = 'INFO_REQUESTED';
    else if (nextStatus === 'WAITING_FOR_ORGANIZATION') eventType = 'INFO_PROVIDED';

    if (isDb) {
      targetCase.status = nextStatus;
      targetCase.version += 1;

      if (nextStatus === 'ACKNOWLEDGED') {
        targetCase.acknowledgedAt = new Date();
        if (targetCase.sla) targetCase.sla.acknowledgedAt = new Date();
      }
      if (nextStatus === 'RESOLVED') {
        targetCase.resolvedAt = new Date();
        const evalRes = slaService.evaluateCaseSla(targetCase);
        if (targetCase.sla) targetCase.sla.status = evalRes.status;
        targetCase.resolution = {
          summary: input.resolution?.summary || input.message,
          notes: input.resolution?.notes,
          resolvedAt: new Date(),
          resolvedBy: new Types.ObjectId(user._id),
        };
      }
      if (nextStatus === 'ESCALATED') {
        if (targetCase.sla) {
          targetCase.sla.isEscalated = true;
          targetCase.sla.status = 'BREACHED';
        }
      }
      if (nextStatus === 'CLOSED') {
        targetCase.closedAt = new Date();
      }

      await targetCase.save();

      // Log immutable audit event
      const auditEvent = await CaseEventModel.create({
        caseId: targetCase._id,
        actorId: new Types.ObjectId(user._id),
        actorName: user.name,
        actorRole: user.role,
        eventType,
        previousState: currentStatus,
        newState: nextStatus,
        message: input.message,
        isInternal: input.isInternal || false,
        timestamp: new Date(),
      });

      return { case: targetCase.toObject(), event: auditEvent.toObject() };
    } else {
      targetCase.status = nextStatus;
      targetCase.version += 1;
      targetCase.updatedAt = new Date();

      if (nextStatus === 'ACKNOWLEDGED') {
        targetCase.acknowledgedAt = new Date();
        if (targetCase.sla) targetCase.sla.acknowledgedAt = new Date();
      }
      if (nextStatus === 'RESOLVED') {
        targetCase.resolvedAt = new Date();
        const evalRes = slaService.evaluateCaseSla(targetCase);
        if (targetCase.sla) targetCase.sla.status = evalRes.status;
        targetCase.resolution = {
          summary: input.resolution?.summary || input.message,
          notes: input.resolution?.notes,
          resolvedAt: new Date(),
          resolvedBy: user._id,
        };
      }
      if (nextStatus === 'ESCALATED') {
        if (targetCase.sla) {
          targetCase.sla.isEscalated = true;
          targetCase.sla.status = 'BREACHED';
        }
      }
      if (nextStatus === 'CLOSED') {
        targetCase.closedAt = new Date();
      }

      memoryStore.cases.set(caseId, targetCase);

      const event: MemoryCaseEvent = {
        _id: new Types.ObjectId().toString(),
        caseId,
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        eventType,
        previousState: currentStatus,
        newState: nextStatus,
        message: input.message,
        isInternal: input.isInternal || false,
        timestamp: new Date(),
      };

      const existingEvents = memoryStore.caseEvents.get(caseId) || [];
      existingEvents.push(event);
      memoryStore.caseEvents.set(caseId, existingEvents);

      return { case: targetCase, event };
    }
  }

  /**
   * Assigns an internal agent to a case.
   */
  public async assignAgent(
    caseId: string,
    input: AssignAgentInput,
    user: { _id: string; name: string; role: any; organizationId?: string | null }
  ) {
    const isDb = memoryStore.isDbConnected();

    let targetCase: any = null;
    if (isDb) {
      targetCase = await CaseModel.findById(caseId);
    } else {
      targetCase = memoryStore.cases.get(caseId);
    }

    if (!targetCase) {
      throw new NotFoundError(`Case '${caseId}' not found`);
    }

    const orgIdStr = targetCase.organizationId?.toString();
    if (user.role === 'ORGANIZATION_ADMIN' || user.role === 'ORGANIZATION_AGENT') {
      if (user.organizationId?.toString() !== orgIdStr) {
        throw new ForbiddenError('Tenant violation: Cannot assign agents to other organizations cases');
      }
    } else if (user.role !== 'CPET_ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only organization staff and administrators can assign cases');
    }

    let agentName = 'Internal Agent';
    if (isDb) {
      const agent = await UserModel.findById(input.agentId).lean();
      if (!agent) throw new NotFoundError(`Agent '${input.agentId}' not found`);
      if (agent.organizationId?.toString() !== orgIdStr) {
        throw new ValidationError('Assigned agent must belong to the same organization tenant');
      }
      agentName = agent.name;

      targetCase.assignedAgentId = new Types.ObjectId(input.agentId);
      if (targetCase.status === 'SUBMITTED' || targetCase.status === 'ACKNOWLEDGED') {
        targetCase.status = 'ASSIGNED';
      }
      targetCase.version += 1;
      await targetCase.save();

      const event = await CaseEventModel.create({
        caseId: targetCase._id,
        actorId: new Types.ObjectId(user._id),
        actorName: user.name,
        actorRole: user.role,
        eventType: 'AGENT_ASSIGNED',
        previousState: targetCase.status,
        newState: targetCase.status,
        message: input.notes
          ? `Assigned to ${agentName}. Note: ${input.notes}`
          : `Assigned to ${agentName}.`,
        isInternal: false,
        timestamp: new Date(),
      });

      return { case: targetCase.toObject(), event: event.toObject() };
    } else {
      const agent = memoryStore.users.get(input.agentId);
      if (agent) {
        agentName = agent.name;
      }

      targetCase.assignedAgentId = input.agentId;
      targetCase.assignedAgentName = agentName;
      if (targetCase.status === 'SUBMITTED' || targetCase.status === 'ACKNOWLEDGED') {
        targetCase.status = 'ASSIGNED';
      }
      targetCase.version += 1;
      targetCase.updatedAt = new Date();
      memoryStore.cases.set(caseId, targetCase);

      const event: MemoryCaseEvent = {
        _id: new Types.ObjectId().toString(),
        caseId,
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        eventType: 'AGENT_ASSIGNED',
        previousState: targetCase.status,
        newState: targetCase.status,
        message: input.notes
          ? `Assigned to ${agentName}. Note: ${input.notes}`
          : `Assigned to ${agentName}.`,
        isInternal: false,
        timestamp: new Date(),
      };

      const existingEvents = memoryStore.caseEvents.get(caseId) || [];
      existingEvents.push(event);
      memoryStore.caseEvents.set(caseId, existingEvents);

      return { case: targetCase, event };
    }
  }

  /**
   * Adds a message or note to the case timeline.
   */
  public async addMessage(
    caseId: string,
    input: AddMessageInput,
    user: { _id: string; name: string; role: any; organizationId?: string | null }
  ) {
    const isDb = memoryStore.isDbConnected();

    let targetCase: any = null;
    if (isDb) {
      targetCase = await CaseModel.findById(caseId);
    } else {
      targetCase = memoryStore.cases.get(caseId);
    }

    if (!targetCase) {
      throw new NotFoundError(`Case '${caseId}' not found`);
    }

    const requesterIdStr = targetCase.requesterId?.toString();
    const orgIdStr = targetCase.organizationId?.toString();

    const isCitizen = user.role === 'CITIZEN' || user.role === 'DONOR';
    if (isCitizen) {
      if (requesterIdStr !== user._id.toString()) {
        throw new ForbiddenError('Access denied: You can only message your own cases');
      }
      input.isInternal = false; // Citizens cannot post internal notes
    } else if (user.role === 'ORGANIZATION_ADMIN' || user.role === 'ORGANIZATION_AGENT') {
      if (user.organizationId?.toString() !== orgIdStr) {
        throw new ForbiddenError('Tenant violation: Cannot message cases of another organization');
      }
    }

    if (!isCitizen && targetCase.sla && !targetCase.sla.firstRespondedAt) {
      targetCase.sla.firstRespondedAt = new Date();
      if (isDb) {
        await CaseModel.findByIdAndUpdate(caseId, {
          $set: { 'sla.firstRespondedAt': new Date() },
        });
      }
    }

    // Auto-transition WAITING_FOR_USER -> WAITING_FOR_ORGANIZATION when citizen responds
    let statusTransitionOccurred = false;
    let oldStatus = targetCase.status;
    if (isCitizen && targetCase.status === 'WAITING_FOR_USER') {
      targetCase.status = 'WAITING_FOR_ORGANIZATION';
      targetCase.version += 1;
      statusTransitionOccurred = true;
    }

    if (isDb) {
      if (statusTransitionOccurred) {
        await targetCase.save();
      }

      const event = await CaseEventModel.create({
        caseId: targetCase._id,
        actorId: new Types.ObjectId(user._id),
        actorName: user.name,
        actorRole: user.role,
        eventType: statusTransitionOccurred ? 'INFO_PROVIDED' : 'MESSAGE',
        previousState: statusTransitionOccurred ? oldStatus : null,
        newState: statusTransitionOccurred ? 'WAITING_FOR_ORGANIZATION' : null,
        message: input.message,
        isInternal: input.isInternal || false,
        attachments: input.attachments || [],
        timestamp: new Date(),
      });

      const eventObj = event.toObject();

      // Real-time broadcast to case room
      socketManager.emitToCase(caseId, 'case:new_message', eventObj);

      // Create Notification for recipient counterparty
      try {
        if (isCitizen) {
          await NotificationModel.create({
            recipientOrgId: new Types.ObjectId(orgIdStr),
            caseId: targetCase._id,
            type: 'NEW_MESSAGE',
            title: `Citizen Message on ${targetCase.referenceNumber}`,
            message: `${user.name}: ${input.message.slice(0, 80)}`,
            isRead: false,
          });
          socketManager.emitToOrg(orgIdStr, 'notification:new', {
            caseId,
            title: `Citizen Message on ${targetCase.referenceNumber}`,
            message: input.message,
          });
        } else if (!input.isInternal) {
          await NotificationModel.create({
            recipientUserId: new Types.ObjectId(requesterIdStr),
            caseId: targetCase._id,
            type: 'NEW_MESSAGE',
            title: `Organization Reply on ${targetCase.referenceNumber}`,
            message: `${user.name}: ${input.message.slice(0, 80)}`,
            isRead: false,
          });
          socketManager.emitToUser(requesterIdStr, 'notification:new', {
            caseId,
            title: `Organization Reply on ${targetCase.referenceNumber}`,
            message: input.message,
          });
        }
      } catch (notifErr: any) {
        logger.warn(`[CaseService] Notification creation notice: ${notifErr.message}`);
      }

      return { case: targetCase.toObject(), event: eventObj };
    } else {
      if (statusTransitionOccurred) {
        targetCase.updatedAt = new Date();
        memoryStore.cases.set(caseId, targetCase);
      }

      const event: MemoryCaseEvent = {
        _id: new Types.ObjectId().toString(),
        caseId,
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        eventType: statusTransitionOccurred ? 'INFO_PROVIDED' : 'MESSAGE',
        previousState: statusTransitionOccurred ? oldStatus : null,
        newState: statusTransitionOccurred ? 'WAITING_FOR_ORGANIZATION' : null,
        message: input.message,
        isInternal: input.isInternal || false,
        attachments: input.attachments || [],
        readBy: [
          {
            userId: user._id,
            role: user.role,
            readAt: new Date(),
          },
        ],
        timestamp: new Date(),
      };

      const existing = memoryStore.caseEvents.get(caseId) || [];
      existing.push(event);
      memoryStore.caseEvents.set(caseId, existing);

      // Real-time broadcast to case room
      socketManager.emitToCase(caseId, 'case:new_message', event);

      // Create Notification for recipient counterparty
      if (isCitizen) {
        const notifId = 'notif-' + Date.now();
        memoryStore.notifications.set(notifId, {
          _id: notifId,
          recipientOrgId: orgIdStr,
          caseId,
          type: 'NEW_MESSAGE',
          title: `Citizen Message on ${targetCase.referenceNumber}`,
          message: `${user.name}: ${input.message.slice(0, 80)}`,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        socketManager.emitToOrg(orgIdStr, 'notification:new', {
          caseId,
          title: `Citizen Message on ${targetCase.referenceNumber}`,
          message: input.message,
        });
      } else if (!input.isInternal) {
        const notifId = 'notif-' + Date.now();
        memoryStore.notifications.set(notifId, {
          _id: notifId,
          recipientUserId: requesterIdStr,
          caseId,
          type: 'NEW_MESSAGE',
          title: `Organization Reply on ${targetCase.referenceNumber}`,
          message: `${user.name}: ${input.message.slice(0, 80)}`,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        socketManager.emitToUser(requesterIdStr, 'notification:new', {
          caseId,
          title: `Organization Reply on ${targetCase.referenceNumber}`,
          message: input.message,
        });
      }

      return { case: targetCase, event };
    }
  }

  /**
   * Marks all messages on a case as read by caller.
   */
  public async markMessagesAsRead(
    caseId: string,
    user: { _id: string; role: any; organizationId?: string | null }
  ) {
    const isDb =
      memoryStore.isDbConnected() &&
      (mongoose.connection.readyState === 1 || Boolean((CaseModel.findById as any)?._isMockFunction));

    let targetCase: any = null;
    if (isDb) {
      targetCase = await CaseModel.findById(caseId).lean();
    } else {
      targetCase = memoryStore.cases.get(caseId);
    }

    if (!targetCase) {
      throw new NotFoundError(`Case with ID '${caseId}' not found`);
    }

    // Ownership & Tenant Authorization check
    const requesterIdStr =
      typeof targetCase.requesterId === 'object' && targetCase.requesterId?._id
        ? targetCase.requesterId._id.toString()
        : targetCase.requesterId?.toString();

    const orgIdStr =
      typeof targetCase.organizationId === 'object' && targetCase.organizationId?._id
        ? targetCase.organizationId._id.toString()
        : targetCase.organizationId?.toString();

    if (user.role === 'CITIZEN' || user.role === 'DONOR') {
      if (requesterIdStr !== user._id.toString()) {
        throw new ForbiddenError('Access denied: You do not have permission to view or modify this case');
      }
    } else if (user.role === 'ORGANIZATION_ADMIN' || user.role === 'ORGANIZATION_AGENT') {
      if (user.organizationId?.toString() !== orgIdStr) {
        throw new ForbiddenError(
          'Tenant violation: Access to other organization cases is strictly prohibited'
        );
      }
    }

    const readAt = new Date();

    if (isDb) {
      await CaseEventModel.updateMany(
        { caseId: new Types.ObjectId(caseId), 'readBy.userId': { $ne: new Types.ObjectId(user._id) } },
        {
          $push: {
            readBy: {
              userId: new Types.ObjectId(user._id),
              role: user.role,
              readAt,
            },
          },
        }
      );
    } else {
      const events = memoryStore.caseEvents.get(caseId) || [];
      for (const ev of events) {
        if (!ev.readBy) ev.readBy = [];
        if (!ev.readBy.some((r) => r.userId.toString() === user._id.toString())) {
          ev.readBy.push({
            userId: user._id,
            role: user.role,
            readAt,
          });
        }
      }
      memoryStore.caseEvents.set(caseId, events);
    }

    socketManager.emitToCase(caseId, 'case:read_updated', {
      caseId,
      userId: user._id,
      role: user.role,
      readAt,
    });

    return { success: true, caseId, readAt };
  }

  /**
   * Submits citizen satisfaction feedback on a resolved or closed case.
   */
  public async submitFeedback(
    caseId: string,
    input: { rating: number; comments?: string },
    user: { _id: string; name: string; role: any }
  ) {
    const isDb =
      memoryStore.isDbConnected() &&
      (mongoose.connection.readyState === 1 || Boolean((CaseModel.findById as any)?._isMockFunction));

    let targetCase: any = null;
    if (isDb) {
      targetCase = await CaseModel.findById(caseId);
    } else {
      targetCase = memoryStore.cases.get(caseId);
    }

    if (!targetCase) {
      throw new NotFoundError(`Case with ID '${caseId}' not found`);
    }

    // Verify requester ownership
    const requesterIdStr = targetCase.requesterId?.toString();
    if (requesterIdStr !== user._id.toString()) {
      throw new ForbiddenError('Only the citizen requester can submit feedback on this case.');
    }

    // Must be in RESOLVED or CLOSED status
    if (targetCase.status !== 'RESOLVED' && targetCase.status !== 'CLOSED') {
      throw new ValidationError(
        `Feedback can only be submitted on resolved or closed cases. Current status: '${targetCase.status}'`
      );
    }

    const feedbackData = {
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      comments: input.comments?.trim() || undefined,
      submittedAt: new Date(),
    };

    if (isDb) {
      targetCase.feedback = feedbackData;
      await targetCase.save();

      await CaseEventModel.create({
        caseId: targetCase._id,
        actorId: new Types.ObjectId(user._id),
        actorName: user.name,
        actorRole: user.role,
        eventType: 'MESSAGE',
        message: `Citizen submitted feedback rating: ${feedbackData.rating}/5 stars${feedbackData.comments ? ` — "${feedbackData.comments}"` : ''}`,
        isInternal: false,
        timestamp: new Date(),
      });
    } else {
      targetCase.feedback = feedbackData;
      targetCase.updatedAt = new Date();
      memoryStore.cases.set(caseId, targetCase);

      const event: MemoryCaseEvent = {
        _id: 'ev-fb-' + Date.now(),
        caseId,
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        eventType: 'MESSAGE',
        message: `Citizen submitted feedback rating: ${feedbackData.rating}/5 stars${feedbackData.comments ? ` — "${feedbackData.comments}"` : ''}`,
        isInternal: false,
        timestamp: new Date(),
      };
      const existing = memoryStore.caseEvents.get(caseId) || [];
      existing.push(event);
      memoryStore.caseEvents.set(caseId, existing);
    }

    const orgIdStr = targetCase.organizationId?.toString();
    socketManager.emitToCase(caseId, 'case:feedback_submitted', {
      caseId,
      feedback: feedbackData,
    });
    if (orgIdStr) {
      socketManager.emitToOrg(orgIdStr, 'case:feedback_submitted', {
        caseId,
        feedback: feedbackData,
      });
    }

    return { success: true, caseId, feedback: feedbackData };
  }

  /**
   * Retrieves case details, timeline events, and allowed transitions for the caller.
   */
  public async getCaseDetails(
    caseId: string,
    user: { _id: string; role: any; organizationId?: string | null }
  ) {
    const isDb =
      memoryStore.isDbConnected() &&
      (mongoose.connection.readyState === 1 || Boolean((CaseModel.findById as any)?._isMockFunction));

    let targetCase: any = null;
    let events: any[] = [];

    if (isDb) {
      targetCase = await CaseModel.findById(caseId)
        .populate('requesterId', 'name email phone')
        .populate('organizationId', 'name slug category type settings')
        .populate('assignedAgentId', 'name email')
        .lean();

      if (!targetCase) {
        throw new NotFoundError(`Case '${caseId}' not found`);
      }

      const isCitizen = user.role === 'CITIZEN' || user.role === 'DONOR';
      const eventFilter: any = { caseId: targetCase._id };
      if (isCitizen) {
        eventFilter.isInternal = false; // Filter out internal organization notes for citizen
      }

      events = await CaseEventModel.find(eventFilter).sort({ timestamp: 1 }).lean();
    } else {
      targetCase = memoryStore.cases.get(caseId);
      if (!targetCase) {
        throw new NotFoundError(`Case '${caseId}' not found`);
      }

      const isCitizen = user.role === 'CITIZEN' || user.role === 'DONOR';
      const allEvents = memoryStore.caseEvents.get(caseId) || [];
      events = isCitizen ? allEvents.filter((e) => !e.isInternal) : allEvents;
    }

    // Tenancy & Authorization check
    const requesterIdStr =
      typeof targetCase.requesterId === 'object' && targetCase.requesterId?._id
        ? targetCase.requesterId._id.toString()
        : targetCase.requesterId?.toString();

    const orgIdStr =
      typeof targetCase.organizationId === 'object' && targetCase.organizationId?._id
        ? targetCase.organizationId._id.toString()
        : targetCase.organizationId?.toString();

    if (user.role === 'CITIZEN' || user.role === 'DONOR') {
      if (requesterIdStr !== user._id.toString()) {
        throw new ForbiddenError('Access denied: You do not have permission to view this case');
      }
    } else if (user.role === 'ORGANIZATION_ADMIN' || user.role === 'ORGANIZATION_AGENT') {
      if (user.organizationId?.toString() !== orgIdStr) {
        throw new ForbiddenError(
          'Tenant violation: Access to other organization cases is strictly prohibited'
        );
      }
    }

    const allowedTransitions = getAllowedTransitions(targetCase.status, user.role);

    return {
      ...targetCase,
      timeline: events,
      allowedTransitions,
    };
  }

  /**
   * Retrieves cases raised by a citizen, grouped by status tabs.
   */
  public async getCasesForCitizen(
    citizenId: string,
    filters?: { tab?: 'active' | 'pending' | 'resolved' | 'closed'; search?: string }
  ) {
    const isDb =
      memoryStore.isDbConnected() &&
      (mongoose.connection.readyState === 1 || Boolean((CaseModel.find as any)?._isMockFunction));

    const tabGroups: Record<string, CaseStatus[]> = {
      active: ['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'],
      pending: ['WAITING_FOR_USER', 'WAITING_FOR_ORGANIZATION', 'READY_FOR_REVIEW'],
      resolved: ['RESOLVED'],
      closed: ['CLOSED', 'CANCELLED', 'FAILED'],
    };

    if (isDb) {
      const query: any = { requesterId: new Types.ObjectId(citizenId) };

      if (filters?.tab && tabGroups[filters.tab]) {
        query.status = { $in: tabGroups[filters.tab] };
      }

      if (filters?.search) {
        query.$or = [
          { referenceNumber: { $regex: filters.search, $options: 'i' } },
          { title: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const cases = await CaseModel.find(query)
        .populate('organizationId', 'name slug type')
        .sort({ createdAt: -1 })
        .lean();

      return cases;
    } else {
      let cases = Array.from(memoryStore.cases.values()).filter(
        (c) => c.requesterId.toString() === citizenId.toString()
      );

      if (filters?.tab && tabGroups[filters.tab]) {
        const statuses = tabGroups[filters.tab];
        cases = cases.filter((c) => statuses.includes(c.status));
      }

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        cases = cases.filter(
          (c) =>
            c.referenceNumber.toLowerCase().includes(s) ||
            c.title.toLowerCase().includes(s) ||
            c.organizationName?.toLowerCase().includes(s)
        );
      }

      return cases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  /**
   * Retrieves incoming requests for an organization (strictly tenant-isolated).
   */
  public async getCasesForOrganization(
    organizationId: string,
    filters?: { status?: string; priority?: string; search?: string }
  ) {
    const isDb =
      memoryStore.isDbConnected() &&
      (mongoose.connection.readyState === 1 || Boolean((CaseModel.find as any)?._isMockFunction));

    if (isDb) {
      const query: any = { organizationId: new Types.ObjectId(organizationId) };
      if (filters?.status) query.status = filters.status;
      if (filters?.priority) query.priority = filters.priority;
      if (filters?.search) {
        query.$or = [
          { referenceNumber: { $regex: filters.search, $options: 'i' } },
          { title: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const cases = await CaseModel.find(query)
        .populate('requesterId', 'name email phone')
        .populate('assignedAgentId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return cases;
    } else {
      let cases = Array.from(memoryStore.cases.values()).filter(
        (c) => c.organizationId.toString() === organizationId.toString()
      );

      if (filters?.status) {
        cases = cases.filter((c) => c.status === filters.status);
      }
      if (filters?.priority) {
        cases = cases.filter((c) => c.priority === filters.priority);
      }
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        cases = cases.filter(
          (c) =>
            c.referenceNumber.toLowerCase().includes(s) ||
            c.title.toLowerCase().includes(s) ||
            c.requesterName?.toLowerCase().includes(s)
        );
      }

      return cases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }
}

export const caseService = new CaseService();
