# CPET APPLICATION
### Consumer Problem Escalation & Tracking Platform
**Comprehensive Technical & Architectural Documentation**

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Existing System](#4-existing-system)
5. [Proposed System](#5-proposed-system)
6. [Requirements](#6-requirements)
   - [6.1 Functional Requirements](#61-functional-requirements)
   - [6.2 Non-Functional Requirements](#62-non-functional-requirements)
7. [Technology Stack](#7-technology-stack)
8. [System Architecture](#8-system-architecture)
   - [8.1 High-Level Architecture Diagram](#81-high-level-architecture-diagram)
   - [8.2 End-to-End Data Flow Diagram](#82-end-to-end-data-flow-diagram)
9. [Database Design](#9-database-design)
   - [9.1 Entity Relationship Diagram (ERD)](#91-entity-relationship-diagram-erd)
   - [9.2 Schema & Model Specifications](#92-schema--model-specifications)
10. [Application Modules](#10-application-modules)
    - [10.1 AI-First Intake Module](#101-ai-first-intake-module)
    - [10.2 Organization Directory & Routing Engine](#102-organization-directory--routing-engine)
    - [10.3 Case Engine & State Machine](#103-case-engine--state-machine)
    - [10.4 Domain Engines: Service Requests, Complaints & Grievances](#104-domain-engines-service-requests-complaints--grievances)
    - [10.5 Emergency Blood & Voluntary Donor Hub](#105-emergency-blood--voluntary-donor-hub)
    - [10.6 SLA & Escalation Engine](#106-sla--escalation-engine)
    - [10.7 Audit & Security Hardening Engine](#107-audit--security-hardening-engine)
11. [Frontend](#11-frontend)
    - [11.1 Architecture & State Management](#111-architecture--state-management)
    - [11.2 Routing Structure & Shell Layouts](#112-routing-structure--shell-layouts)
    - [11.3 Citizen Portal Pages](#113-citizen-portal-pages)
    - [11.4 Organization Workspace Pages](#114-organization-workspace-pages)
12. [Backend](#12-backend)
    - [12.1 Core Services & Middleware Architecture](#121-core-services--middleware-architecture)
    - [12.2 In-Memory Store & Database Resilience Pattern](#122-in-memory-store--database-resilience-pattern)
    - [12.3 Background Jobs & Queue Workers](#123-background-jobs--queue-workers)
13. [API Documentation](#13-api-documentation)
14. [Authentication](#14-authentication)
    - [14.1 Authentication & Session Lifecycle](#141-authentication--session-lifecycle)
    - [14.2 Role-Based Access Control (RBAC) Matrix](#142-role-based-access-control-rbac-matrix)
    - [14.3 Multi-Tenant Scope Isolation](#143-multi-tenant-scope-isolation)
15. [Real-Time Communication](#15-real-time-communication)
    - [15.1 Socket.IO Infrastructure & Channel Architecture](#151-socketio-infrastructure--channel-architecture)
    - [15.2 Event Protocols & Sequences](#152-event-protocols--sequences)
16. [Testing](#16-testing)
    - [16.1 Test Suite Breakdown & Verification Results](#161-test-suite-breakdown--verification-results)
    - [16.2 Load Runner & High-Throughput Verification](#162-load-runner--high-throughput-verification)
17. [Deployment](#17-deployment)
    - [17.1 Containerization & Docker Orchestration](#171-containerization--docker-orchestration)
    - [17.2 Continuous Integration (CI/CD) Pipeline](#172-continuous-integration-cicd-pipeline)
    - [17.3 Production Hardening & Operations Runbook](#173-production-hardening--operations-runbook)
18. [Screenshots](#18-screenshots)
19. [Limitations](#19-limitations)
20. [Future Enhancements](#20-future-enhancements)
21. [Conclusion](#21-conclusion)

---

## 1. Introduction

**CPET (Consumer Problem Escalation & Tracking)** is an enterprise-grade, omnichannel problem resolution platform designed to bridge the gap between citizens (consumers) and organizations (public utilities, consumer brands, municipal corporations, healthcare providers, and emergency networks).

Traditional grievance and service request mechanisms suffer from fragmentation: citizens are forced to navigate convoluted bureaucratic hierarchies, decipher cryptic form schemas, and endure one-way support silos where requests disappear into black holes. When timelines lapse, consumers lack transparent recourse.

CPET reimagines citizen engagement through an **AI-First Intake** philosophy. Rather than compelling users to choose category codes or navigate nested dropdown menus, CPET enables citizens to explain their situation in natural human language or spoken voice (e.g., *"I have a Lloyd AC and it needs servicing"*). The system parses intent, extracts brands, products, and locations, builds validated structured forms dynamically, routes the request to verified organizational destinations, and orchestrates an auditable, bidirectional lifecycle complete with SLA countdowns, automated hierarchical escalations, and citizen satisfaction ratings.

---

## 2. Problem Statement

Across public administration and consumer service sectors, consumer grievance redressal faces structural systemic failures:
1. **Intake Friction & Form Fatigue**: Consumers must understand internal organizational structures to pick the correct department or ticket classification.
2. **Opaque One-Way Silos**: After raising a ticket, citizens receive no visibility into internal progress or assigned field technicians, leading to duplicated inquiries and consumer mistrust.
3. **Absence of Enforceable SLAs**: Organizations publish theoretical turnaround times without automated penalty, warning, or supervisory escalation triggers.
4. **Tenant Data Leakage in Multi-Org Portals**: Legacy systems often lack rigid row-level security and multi-tenant scoping, allowing support agents to inadvertently access data across jurisdictions or competing corporate brands.
5. **Critical Emergency Inefficiencies**: In emergency situations—such as urgent blood discovery—existing systems broadcast unverified donor phone numbers publicly, creating privacy violations, spam, and failure to find immediate donors within proximity.

---

## 3. Objectives

The CPET platform fulfills the following architectural and functional objectives:
- **Zero-Cognitive-Overhead Intake**: Extract intent, entities, brands, and categories from plain text and voice descriptions, prompting only for missing mandatory fields.
- **Deterministic Multi-Tenant Routing**: Route cases to verified organizational endpoints (internal queues, webhooks, or departmental desks) matching category, brand, and jurisdiction.
- **Auditable Bidirectional Lifecycle**: Maintain an append-only timeline of messages, attachments, read receipts, and status transitions governed by a deterministic Finite State Machine (FSM).
- **Proactive SLA & Automated Escalation**: Continuously monitor milestone deadlines (Acknowledgment, First Response, Resolution) and trigger tiered supervisor escalations via distributed queues upon breach.
- **Privacy-Preserving Blood Network**: Implement a 5-tier progressive radius discovery engine (Locality $\rightarrow$ Municipality $\rightarrow$ Sub-District $\rightarrow$ District $\rightarrow$ State) with encrypted proxy dispatch that shields personal donor contact information.
- **Strict Tenant & Role-Based Isolation**: Guarantee that organizational agents only view, triage, and mutate cases strictly scoped to their tenant identity.
- **Sub-Second Performance & High Concurrency**: Sustain over 1,500 requests per second under peak load with sub-10ms response times and zero message drops.

---

## 4. Existing System

Existing grievance and customer support frameworks (e.g., generic CRM ticketing tools, static municipal web portals) operate under outdated design paradigms:
- **Rigid Forms**: Users are presented with static, 20-field web forms where non-applicable fields are marked mandatory.
- **Asymmetric Transparency**: Internal team notes and status transitions remain hidden from the consumer until a ticket is abruptly closed with canned text.
- **Manual Escalations**: Tickets are escalated only when a consumer manually calls a call center or submits duplicate complaints.
- **Unverified Third-Party Scrapers**: Contact details for service centers and emergency donors are scraped from unverified internet lists, exposing citizens to scams and privacy breaches.
- **Siloed Databases**: Municipal complaints, consumer electronics repairs, and blood emergencies require three distinct applications, disparate logins, and disconnected interfaces.

---

## 5. Proposed System

CPET establishes a unified platform connecting citizens, public authorities, and private enterprises:
- **Conversational Intake Engine**: Utilizes natural language understanding to map user utterances to schema-validated JSON data structures.
- **Configurable Directory & Destination Registry**: Centralized repository of verified organizations, brands, products, service categories, and dispatch endpoints (Email, Webhook, API, Internal Queue).
- **Universal Case Engine**: A polymorphic schema capable of handling diverse domains (Service Requests, Consumer Complaints, Municipal Grievances, Blood Requirements) through dynamic schemas while maintaining consistent core lifecycle mechanics.
- **Strict State Machine (FSM)**: Restricts state transitions to mathematically valid paths, preventing illegitimate status jumps and concurrency overwrites via optimistic locking.
- **Tiered Escalation Queue**: BullMQ and Redis-driven delayed jobs evaluate SLA thresholds and escalate breached tickets across organizational management tiers.
- **Two-Way Real-Time Chat**: WebSockets deliver instant bidirectional messaging, agent typing indicators, read receipts, and status broadcasts directly into user portals.
- **Privacy Relay Mechanism**: Enables emergency contact relays to voluntary blood donors using anonymous proxy codes, masking phone numbers and home addresses.

---

## 6. Requirements

### 6.1 Functional Requirements

| ID | Requirement Area | Description |
| :--- | :--- | :--- |
| **FR-01** | **User Registration & Auth** | Support Citizen and Organization onboarding, bcrypt password hashing, JWT access/refresh token pairs, and secure cookie storage. |
| **FR-02** | **AI-First Intake** | Natural language analysis of free-form text and audio input to extract `CaseType`, `organization`, `productService`, and missing attributes. |
| **FR-03** | **Deterministic Routing** | Rule-based resolution of target organization, department, and dispatch channel based on brand, service category, and geographic jurisdiction. |
| **FR-04** | **Universal Case Management** | Create, view, update, and track cases with unique reference numbers (e.g., `CPET-2026-44537`). |
| **FR-05** | **Two-Way Discussion** | Real-time messaging between citizens and assigned organization agents within the case context, including attachments. |
| **FR-06** | **State Machine Transitions** | Enforce allowed status paths (`SUBMITTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`). |
| **FR-07** | **Citizen Confirmation & Rating** | Enable citizens to confirm resolution, dispute/reopen cases, and submit 1–5 star ratings with feedback notes. |
| **FR-08** | **Tenant-Isolated Queue** | Organization dashboard featuring live aggregations and triage queues strictly isolated by `organizationId`. |
| **FR-09** | **5-Tier Blood Discovery** | Geographic proximity search for compatible blood groups across Locality, Municipality, Sub-District, District, and State levels. |
| **FR-10** | **Anonymous Contact Relay** | Dispatch emergency blood alerts to voluntary donors via masked proxy identifiers without exposing PII. |
| **FR-11** | **Automated SLA Escalation** | Compute milestone countdowns; trigger BullMQ automated escalation sweeps upon SLA deadline breaches. |

### 6.2 Non-Functional Requirements

| ID | Parameter | Requirement Standard |
| :--- | :--- | :--- |
| **NFR-01** | **Security & Injection Defense** | Sanitization against NoSQL injection (`$where`, `$ne`) and XSS; strict Helmet security headers and CORS whitelisting. |
| **NFR-02** | **Rate Limiting** | Multi-tier limits on authentication (10 req/15min), case creation (30 req/hr), AI endpoints (60 req/10min), and global requests (2000 req/15min). |
| **NFR-03** | **Concurrency & Data Integrity** | Optimistic concurrency locking via atomic document `version` checking; MongoDB transaction support. |
| **NFR-04** | **Throughput & Latency** | Baseline throughput $> 750$ req/s (achieved peak 2,862 req/s) with p50 API latency $< 5$ ms. |
| **NFR-05** | **Availability & Resilience** | Self-healing health probes (`/health/live`, `/health/ready`); memory store fallback when external Redis/MongoDB daemons are temporarily offline. |
| **NFR-06** | **Responsive Cross-Device UX** | Fluid responsiveness across Mobile (375x667), Tablet (768x1024), and Desktop (1536x864) viewports. |
| **NFR-07** | **Observability** | Structured JSON logging with unique `x-correlation-id` tracing across every request and audit log entry. |

---

## 7. Technology Stack

| Layer | Technology | Version | Purpose / Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `18.3.1` | Component-driven declarative UI architecture with concurrent rendering. |
| **Build & Bundler** | Vite | `6.0.7` | High-performance ES module bundler and hot module replacement dev server. |
| **Frontend Routing** | React Router DOM | `7.1.3` | Client-side routing with nested shell layouts and role-based route protection. |
| **State & Data Fetching**| TanStack Query (React Query) | `5.64.2` | Declarative asynchronous server-state caching, deduping, and background refetching. |
| **Styling System** | Tailwind CSS | `3.4.17` | Utility-first CSS framework enforcing curated spacing, typography, and dark-mode tokens. |
| **Icons** | Lucide React | `0.473.0` | Accessible, tree-shakeable vector icon suite. |
| **Form Validation** | Zod + React Hook Form | `3.24.1` / `7.54.2` | Type-safe schema validation with zero runtime overhead on standard client inputs. |
| **Backend Runtime** | Node.js (Alpine Container) | `20 LTS` | Event-driven, asynchronous I/O JavaScript runtime. |
| **API Framework** | Express.js | `4.21.2` | Lightweight, robust web application framework. |
| **Real-Time Gateway** | Socket.IO | `4.8.3` | Low-latency, bidirectional WebSocket connection with polling fallback. |
| **Database** | MongoDB 7.0 & Mongoose | `7.0` / `8.9.5` | Document database with 2dsphere geospatial indexing and flexible polymorphic schemas. |
| **Cache & Queue Bus** | Redis & BullMQ | `7.2` / `5.34.8` | In-memory key-value cache, pub/sub event bus, and reliable delayed job queue. |
| **Cryptography & Auth** | bcryptjs & jsonwebtoken | `2.4.3` / `9.0.2` | Salted password hashing (10 rounds) and cryptographically signed session tokens. |
| **Reverse Proxy / Web** | Nginx | `1.27 Alpine` | High-speed static asset delivery, Gzip compression, and API reverse proxying. |
| **Containerization** | Docker & Docker Compose | `v24+` / `v3.8` | Production container isolation, multi-stage building, and orchestration. |
| **Testing Harness** | Vitest & Supertest | `2.1.8` / `7.0.0` | Unit, integration, and end-to-end API testing suite. |

---

## 8. System Architecture

### 8.1 High-Level Architecture Diagram

```mermaid
flowchart TD
    Client[Citizen / Org Browser] -->|HTTPS :80/:443| Nginx[Nginx Reverse Proxy]
    
    subgraph Container_Host [Docker Orchestration Bridge]
        Nginx -->|Static Assets| SPA[React 18 SPA Dist]
        Nginx -->|/api/* HTTP| NodeCluster[Node.js Express Backend API :5000]
        Nginx -->|/socket.io/* WS| SocketGateway[Socket.IO WebSocket Gateway]
        
        subgraph Backend_Services [Node.js Modular Core]
            NodeCluster --> AuthModule[Auth & RBAC Middleware]
            NodeCluster --> AIIntake[AI Intake & NLP Extractor]
            NodeCluster --> CaseEngine[Universal Case & State Engine]
            NodeCluster --> RoutingEngine[Routing & Directory Matcher]
            NodeCluster --> SLAEngine[SLA & Escalation Service]
            NodeCluster --> BloodModule[Blood Hub & 5-Tier Discovery]
            SocketGateway <--> CaseEngine
        end
        
        subgraph Data_Storage [Persistent & Caching Tiers]
            CaseEngine <-->|Queries & Writes| MongoDB[(MongoDB 7.0 Replica Set)]
            SLAEngine <-->|Delayed Jobs & Sweeps| BullMQ[BullMQ Job Queue]
            BullMQ <--> Redis[(Redis 7.2 Cache & Bus)]
            CaseEngine -->|Audit Plugin| AuditLog[(Immutable Audit Events)]
        end
    end
```

### 8.2 End-to-End Data Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen User
    participant AI as AI Intake Engine
    participant Route as Routing Engine
    participant Case as Case Engine (FSM)
    actor Org as Org Support Agent
    participant SLA as SLA / BullMQ Queue

    Citizen->>AI: "I have a Lloyd AC and it needs servicing."
    AI-->>Citizen: Extracted: SERVICE_REQUEST | Lloyd | AC Care. Prompts for location/notes.
    Citizen->>AI: Provides Location ("Delhi") & Submits
    AI->>Route: Evaluate destination (Brand: Lloyd, Product: AC, City: Delhi)
    Route-->>AI: Matched Org: Lloyd Havells | Dept: Technical Field Service
    AI->>Case: POST /api/v1/cases (Create Case)
    Case->>SLA: Register SLA Milestones (48h SLA, 4h Ack, 8h Response)
    Case-->>Citizen: Case Created: CPET-2026-44537 (Status: SUBMITTED)
    Case->>Org: Socket.IO Broadcast: org:66d00... (New Request Available)
    Org->>Case: POST /api/v1/cases/:id/transition (ACKNOWLEDGED -> IN_PROGRESS)
    Org->>Case: POST /api/v1/cases/:id/messages ("Technician visiting tomorrow 10 AM")
    Case-->>Citizen: Socket.IO Push: New Message & Status IN_PROGRESS
    Org->>Case: POST /api/v1/cases/:id/transition (RESOLVED: "AC coils cleaned")
    Case-->>Citizen: Case RESOLVED Notification
    Citizen->>Case: POST /api/v1/cases/:id/feedback (Rating: 5 Stars, "Prompt service!")
    Case->>Case: Transition to CLOSED & Commit Immutable Audit Record
```

---

## 9. Database Design

### 9.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Case : creates
    User ||--o{ Session : maintains
    User ||--o{ CaseEvent : triggers
    Organization ||--o{ User : employs
    Organization ||--o{ Destination : configures
    Organization ||--o{ Case : resolves
    Case ||--o{ CaseEvent : records
    Case ||--o{ Notification : generates
    User ||--o{ Donor : registers
    SlaPolicy ||--o{ Organization : governs

    User {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role
        ObjectId organizationId FK
        boolean isEmailVerified
        boolean isActive
        Date createdAt
    }

    Organization {
        ObjectId _id PK
        string name
        string slug UK
        string brandName
        string type
        string category
        array departments
        array locations
        object settings
    }

    Case {
        ObjectId _id PK
        string referenceNumber UK
        string type
        string title
        string description
        ObjectId requesterId FK
        ObjectId organizationId FK
        ObjectId assignedAgentId FK
        string priority
        string status
        object sla
        object feedback
        number version
    }

    CaseEvent {
        ObjectId _id PK
        ObjectId caseId FK
        ObjectId actorId FK
        string eventType
        string message
        array attachments
        array readBy
        Date timestamp
    }

    Destination {
        ObjectId _id PK
        ObjectId organizationId FK
        string departmentId
        string type
        string value
        string verificationStatus
    }

    Donor {
        ObjectId _id PK
        ObjectId userId FK
        string anonymousDonorCode UK
        string bloodGroup
        string availabilityStatus
        object approximateLocation
        string contactPhone
    }

    SlaPolicy {
        ObjectId _id PK
        ObjectId organizationId FK
        string priority
        number acknowledgementHours
        number firstResponseHours
        number resolutionHours
        object escalationPolicy
    }

    Session {
        ObjectId _id PK
        ObjectId userId FK
        string refreshTokenHash
        Date expiresAt
    }

    Otp {
        ObjectId _id PK
        string target
        string otpHash
        string purpose
        Date expiresAt
    }

    Notification {
        ObjectId _id PK
        ObjectId recipientUserId FK
        ObjectId caseId FK
        string type
        string message
        boolean isRead
    }
```

### 9.2 Schema & Model Specifications

#### 9.2.1 Collection: `cases` (Model: `CaseModel`)
Stores universal consumer requests, complaints, and emergency requirements.
- **Fields & Types**:
  - `referenceNumber` (String, Required, Unique, Indexed, e.g. `CPET-2026-44537`)
  - `type` (String, Required, Indexed, Enum: `SERVICE_REQUEST`, `COMPLAINT`, `GRIEVANCE`, `BLOOD_REQUEST`, `SUPPORT_REQUEST`, `FEEDBACK`)
  - `title` (String, Required, Trimmed, Indexed)
  - `description` (String, Required)
  - `category` (String, Required, Trimmed, Indexed)
  - `subcategory` (String, Optional)
  - `productService` (String, Optional)
  - `structuredData` (Mixed Object, Default `{}`)
  - `location` (Embedded Document):
    - `address`, `locality`, `city`, `municipality`, `subDistrict`, `district`, `state`, `pincode` (Strings)
    - `coordinates` (`[Number]`, 2dsphere indexed)
  - `requesterId` (ObjectId referencing `User`, Required, Indexed)
  - `organizationId` (ObjectId referencing `Organization`, Required, Indexed)
  - `assignedAgentId` (ObjectId referencing `User`, Optional, Nullable, Indexed)
  - `priority` (String, Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`, Default `MEDIUM`, Indexed)
  - `status` (String, Required, Indexed, Enum: `DRAFT`, `READY_FOR_REVIEW`, `CONFIRMED`, `SUBMITTED`, `ACKNOWLEDGED`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_USER`, `WAITING_FOR_ORGANIZATION`, `RESOLVED`, `CLOSED`, `ESCALATED`, `REOPENED`, `FAILED`, `CANCELLED`)
  - `routing` (Embedded Document): `destinationId`, `destinationType`, `destinationValue`, `department`, `routedAt`, `routeMatchedReason`
  - `attachments` (Array of Embedded Objects): `name`, `url`, `fileType`, `size`, `uploadedAt`, `uploaderId`
  - `sla` (Embedded Document):
    - `dueAt` (Date, Required, Indexed)
    - `slaHours` (Number, Default `48`)
    - `acknowledgementDueAt`, `firstResponseDueAt`, `resolutionDueAt` (Dates)
    - `acknowledgedAt`, `firstRespondedAt` (Dates)
    - `status` (String, Enum: `ON_TRACK`, `AT_RISK`, `BREACHED`, `MET`, Default `ON_TRACK`, Indexed)
    - `isEscalated` (Boolean, Default `false`, Indexed)
    - `currentEscalationTier` (String)
    - `escalationHistory` (Array of Escalation Records)
  - `resolution` (Embedded Document): `summary`, `notes`, `resolvedAt`, `resolvedBy`
  - `feedback` (Embedded Document): `rating` (Number, 1–5), `comments` (String), `submittedAt` (Date)
  - `version` (Number, Default `1` for optimistic locking)
  - `submittedAt`, `acknowledgedAt`, `resolvedAt`, `closedAt` (Dates)
  - `timestamps` (Mongoose automatic `createdAt`, `updatedAt`)
- **Indexes**:
  - Unique Index: `{ referenceNumber: 1 }`
  - Compound Index: `{ requesterId: 1, status: 1, createdAt: -1 }`
  - Compound Index: `{ organizationId: 1, status: 1, priority: 1, createdAt: -1 }`
  - Compound Index: `{ organizationId: 1, assignedAgentId: 1 }`
  - Compound Index: `{ "sla.status": 1, "sla.dueAt": 1, status: 1 }`
  - Geospatial Index: `{ "location.coordinates": "2dsphere" }`

#### 9.2.2 Collection: `caseevents` (Model: `CaseEventModel`)
Immutable timeline log of state mutations, comments, and file attachments.
- **Fields & Types**:
  - `caseId` (ObjectId referencing `Case`, Required, Indexed)
  - `actorId` (ObjectId referencing `User`, Nullable for system actions)
  - `actorName` (String, Required)
  - `actorRole` (String, Enum: `CITIZEN`, `DONOR`, `ORGANIZATION_ADMIN`, `ORGANIZATION_AGENT`, `CPET_ADMIN`, `SYSTEM`, Required)
  - `eventType` (String, Required, Enum: `CASE_CREATED`, `STATUS_CHANGE`, `AGENT_ASSIGNED`, `MESSAGE`, `INFO_REQUESTED`, `INFO_PROVIDED`, `SLA_WARNING`, `ESCALATED`, `RESOLVED`, `REOPENED`, `CLOSED`, `ATTACHMENT_ADDED`)
  - `previousState`, `newState` (Strings, Optional)
  - `message` (String, Required)
  - `isInternal` (Boolean, Default `false`)
  - `attachments` (Array of Objects: `name`, `url`, `fileType`, `size`)
  - `readBy` (Array of Objects: `userId`, `role`, `readAt`)
  - `metadata` (Mixed Object)
  - `timestamp` (Date, Default `Date.now`, Indexed)
- **Indexes**:
  - Compound Index: `{ caseId: 1, timestamp: 1 }`
  - Index: `{ eventType: 1 }`

#### 9.2.3 Collection: `organizations` (Model: `OrganizationModel`)
Configurable directory of verified public and private entities.
- **Fields & Types**:
  - `name` (String, Required, Indexed)
  - `slug` (String, Required, Unique, Lowercase, Indexed)
  - `brandName` (String, Indexed)
  - `aliases` (`[String]`, Indexed)
  - `type` (String, Enum: `MUNICIPAL`, `UTILITY`, `HEALTHCARE`, `CONSUMER_GOODS`, `TRANSPORT`, `GOVERNMENT`, `OTHER`)
  - `category` (String, Required, Indexed)
  - `departments` (Array of Objects: `id`, `name`, `code`, `active`, `contactEmail`)
  - `services` (`[String]`), `products` (`[String]`), `serviceCategories` (`[String]`)
  - `locations` (Array of Objects: `city`, `state`, `pincodes`, `address`, `isHeadquarters`)
  - `jurisdictions` (`[String]`)
  - `status` (String, Enum: `PENDING`, `VERIFIED`, `SUSPENDED`, Default `PENDING`, Indexed)
  - `active` (Boolean, Default `true`, Indexed)
  - `contactEmail` (String, Required), `contactPhone` (String), `address` (String)
  - `settings` (Object: `autoAssign` Boolean, `defaultSlaHours` Number Default `48`)
- **Indexes**:
  - Unique Index: `{ slug: 1 }`
  - Text/Keyword Index: `name`, `brandName`, `services`, `products`

#### 9.2.4 Collection: `users` (Model: `UserModel`)
User credentials, role authorization, and tenant linkage.
- **Fields & Types**:
  - `name` (String, Required)
  - `email` (String, Required, Unique, Lowercase, Indexed)
  - `phone` (String, Optional, Indexed)
  - `passwordHash` (String, Required, Hidden from queries via `select: false`)
  - `role` (String, Enum: `CITIZEN`, `DONOR`, `ORGANIZATION_ADMIN`, `ORGANIZATION_AGENT`, `CPET_ADMIN`, `CPET_SUPPORT`, `SUPER_ADMIN`, Default `CITIZEN`, Indexed)
  - `organizationId` (ObjectId referencing `Organization`, Nullable, Indexed)
  - `isEmailVerified` (Boolean, Default `false`), `isPhoneVerified` (Boolean, Default `false`)
  - `isActive` (Boolean, Default `true`, Indexed)
  - `consent` (Object: `termsAccepted` Boolean, `termsVersion` String, `acceptedAt` Date)
  - `lastLoginAt` (Date)
- **Indexes**:
  - Unique Index: `{ email: 1 }`
  - Compound Index: `{ organizationId: 1, role: 1 }`

#### 9.2.5 Collection: `donors` (Model: `DonorModel`)
Voluntary emergency blood registry with privacy-shielding mechanisms.
- **Fields & Types**:
  - `userId` (ObjectId referencing `User`, Indexed)
  - `anonymousDonorCode` (String, Required, Unique, Indexed, e.g. `DONOR-HYD-1001`)
  - `bloodGroup` (String, Enum: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, Required, Indexed)
  - `availabilityStatus` (String, Enum: `AVAILABLE`, `UNAVAILABLE`, `COOLDOWN`, Default `AVAILABLE`, Indexed)
  - `approximateLocation` (Object):
    - `locality`, `municipality`, `subDistrict`, `district`, `state`, `pincode` (Strings)
    - `coordinates` (`[Number]`, 2dsphere indexed)
  - `contactPreference` (String, Enum: `IN_APP`, `RELAY_SMS`, `ANONYMOUS_PROXY`, `PHONE`, Default `IN_APP`)
  - `contactPhone` (String, Required, Hidden from public queries via `select: false`)
  - `contactEmail` (String, Hidden via `select: false`)
  - `lastDonatedAt` (Date), `isVerified` (Boolean)
- **Indexes**:
  - Unique Index: `{ anonymousDonorCode: 1 }`
  - Geospatial Index: `{ "approximateLocation.coordinates": "2dsphere" }`
  - Compound Index: `{ bloodGroup: 1, availabilityStatus: 1 }`

#### 9.2.6 Collection: `destinations` (Model: `DestinationModel`)
External integration endpoints for outbound routing.
- **Fields & Types**:
  - `organizationId` (ObjectId referencing `Organization`, Required, Indexed)
  - `departmentId` (String), `serviceCategory` (String)
  - `type` (String, Enum: `EMAIL`, `API`, `WEBHOOK`, `INTERNAL_QUEUE`, `OFFICIAL_PORTAL`, Required, Indexed)
  - `value` (String, Required, e.g. `support@lloyd.in` or `https://api.lloyd.in/dispatch`)
  - `credentials` (Mixed Object, Encrypted/Protected)
  - `verificationStatus` (String, Enum: `PENDING`, `VERIFIED`, `REJECTED`, Default `PENDING`)
  - `activeStatus` (Boolean, Default `true`, Indexed)

#### 9.2.7 Collection: `slapolicies` (Model: `SlaPolicyModel`)
Configurable service level agreement definitions.
- **Fields & Types**:
  - `name` (String, Required)
  - `organizationId` (ObjectId referencing `Organization`, Nullable for global defaults, Indexed)
  - `caseType` (String, Indexed), `category` (String, Indexed)
  - `priority` (String, Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`, Required, Indexed)
  - `acknowledgementHours` (Number, Default `4`)
  - `firstResponseHours` (Number, Default `8`)
  - `resolutionHours` (Number, Default `48`)
  - `businessHours` (Object: `enabled` Boolean, `start` String, `end` String, `workingDays` `[Number]`)
  - `escalationPolicy` (Object: `enabled` Boolean, `tiers` Array of Escalation Tiers)
  - `active` (Boolean, Default `true`, Indexed)

#### 9.2.8 Collection: `sessions` (Model: `SessionModel`)
Active user login sessions and refresh tokens.
- **Fields & Types**:
  - `userId` (ObjectId referencing `User`, Required, Indexed)
  - `refreshTokenHash` (String, Required, Indexed)
  - `userAgent` (String), `ipAddress` (String)
  - `isRevoked` (Boolean, Default `false`, Indexed)
  - `expiresAt` (Date, Required, TTL Index `{ expires: 0 }` for automatic eviction)

#### 9.2.9 Collection: `otps` (Model: `OtpModel`)
One-time passcodes for authentication and verification.
- **Fields & Types**:
  - `target` (String, Required, Indexed, e.g. Phone or Email)
  - `otpHash` (String, Required)
  - `purpose` (String, Enum: `SIGNUP`, `LOGIN`, `PASSWORD_RESET`, `PHONE_VERIFICATION`, Required, Indexed)
  - `attempts` (Number, Default `0`)
  - `isVerified` (Boolean, Default `false`)
  - `expiresAt` (Date, Required, TTL Index `{ expires: 0 }` for automatic eviction after 10 minutes)

#### 9.2.10 Collection: `notifications` (Model: `NotificationModel`)
In-app notification records for citizens and organization staff.
- **Fields & Types**:
  - `recipientUserId` (ObjectId referencing `User`, Indexed)
  - `recipientOrgId` (ObjectId referencing `Organization`, Indexed)
  - `caseId` (ObjectId referencing `Case`, Indexed)
  - `type` (String, Enum: `NEW_MESSAGE`, `STATUS_UPDATE`, `CASE_ASSIGNED`, `DISPATCH_RESULT`, `SLA_ALERT`, Required, Indexed)
  - `title` (String, Required), `message` (String, Required)
  - `isRead` (Boolean, Default `false`, Indexed)
  - `readAt` (Date), `metadata` (Mixed Object)

---

## 10. Application Modules

### 10.1 AI-First Intake Module
- **Location**: `backend/src/modules/ai/`
- **Core Principle**: The user should never need to decipher complex categorization codes.
- **NLP Analysis**: Inspects natural language text or transcribed speech audio. Extracts key intent (`SERVICE_REQUEST`, `COMPLAINT`, `GRIEVANCE`, `BLOOD_REQUEST`), target brand/organization (e.g. `Lloyd`, `Apex`, `Samsung`), product/service domain (e.g. `AC`, `Transformer`), and urgency.
- **Dynamic Question Generation**: Automatically identifies missing mandatory attributes (e.g., city, address, purchase invoice number) and prompts conversational follow-up questions before producing a structured, verified request payload ready for user confirmation.

### 10.2 Organization Directory & Routing Engine
- **Location**: `backend/src/modules/routing/` & `backend/src/modules/organizations/`
- **Deterministic Routing Matrix**:
  1. Matches brand aliases to registered organization records.
  2. Evaluates product/service taxonomy against configured organizational departments.
  3. Validates geographic jurisdiction based on citizen locality, municipality, and district.
  4. Selects the most specific verified destination (Internal Organization Queue, Official Departmental Desk, or Outbound Webhook).
- **Fallback Guarantee**: If no specific organization matches, the request routes automatically to the Central Consumer Protection & Escalation Authority (Apex) triage desk.

### 10.3 Case Engine & State Machine
- **Location**: `backend/src/modules/cases/`
- **Finite State Machine (FSM)**:
  Enforces strictly valid state transitions:
  - `SUBMITTED` $\rightarrow$ `ACKNOWLEDGED`, `CANCELLED`
  - `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_USER`, `ASSIGNED`
  - `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_USER`, `RESOLVED`, `ESCALATED`
  - `WAITING_FOR_USER` $\rightarrow$ `IN_PROGRESS`, `CANCELLED`
  - `RESOLVED` $\rightarrow$ `CLOSED` (Citizen confirmation), `IN_PROGRESS` (Disputed / Reopened)
  - `ESCALATED` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`
- **Optimistic Concurrency Control**:
  Every case document carries a numerical `version` counter. Concurrent state mutation attempts evaluate `version` atomically; stale writes trigger `409 CONFLICT`.

### 10.4 Domain Engines: Service Requests, Complaints & Grievances
- **Location**: `backend/src/modules/domains/`
- **Schema Engine**: Validates domain-specific dynamic payloads (`structuredData`) against predefined schemas:
  - *Service Requests*: Requires brand, product model, serial number, defect description, warranty status.
  - *Complaints*: Requires retailer/vendor name, purchase date, transaction amount, grievance narrative, requested relief (refund/replacement).
  - *Grievances*: Requires public authority name, municipal ward, problem location, public hazard severity.

### 10.5 Emergency Blood & Voluntary Donor Hub
- **Location**: `backend/src/modules/domains/blood.service.ts`
- **5-Tier Progressive Radius Discovery**:
  - *Tier 1 (Locality)*: $< 5$ km radius
  - *Tier 2 (Municipality / City)*: $< 15$ km radius
  - *Tier 3 (Mandal / Sub-District)*: $< 30$ km radius
  - *Tier 4 (District)*: $< 75$ km radius
  - *Tier 5 (State / National)*: $> 75$ km radius
- **Privacy Relay & Shielding**:
  Donor phone numbers, emails, and exact street addresses are marked `select: false` in MongoDB. Citizens interact with donors via an anonymous proxy code (e.g. `DONOR-HYD-1001`), and alerts are relayed securely via encrypted dispatch.

### 10.6 SLA & Escalation Engine
- **Location**: `backend/src/modules/sla/` & `backend/src/modules/escalation/`
- **Milestone Tracking**: Computes exact timestamps for Acknowledgment Due, First Response Due, and Resolution Due based on priority and working hours.
- **Automated Delayed Sweeps**: Integrates BullMQ with Redis to schedule delayed monitoring jobs. When a case approaches or exceeds an SLA milestone without organizational acknowledgment, the system escalates the ticket to higher supervisory tiers, emits real-time WebSocket alerts, and writes an immutable audit record.

### 10.7 Audit & Security Hardening Engine
- **Location**: `backend/src/middleware/security.ts`, `audit.ts`, `rateLimiter.ts`
- **NoSQL Injection Defense**: Recursive sanitization middleware strips `$where`, `$ne`, `$gt`, `$regex` object queries from request payloads.
- **XSS Defense**: HTML entity encoding and DOM sanitization.
- **Immutable Audit Trail**: Mongoose audit plugin intercepts all updates and appends actor identity, previous state, new state, and IP address to the `caseevents` ledger.

---

## 11. Frontend

### 11.1 Architecture & State Management
The frontend is constructed with **React 18** and **Vite**, organized in a monorepo workspace (`frontend/`). State management is divided into:
1. **Client Identity & Session**: `AuthContext` provides global authentication state (`user`, `token`, `role`, `login`, `logout`) synchronized with secure local storage and HTTP-only cookies.
2. **Server-State Synchronization**: **TanStack React Query** manages asynchronous API data fetching, optimistic caching, automatic cache invalidation on mutations, and background polling.
3. **Real-Time Push**: Client-side Socket.IO client joins user-specific and case-specific rooms to push incoming messages and status changes into active React views without manual page refreshes.

### 11.2 Routing Structure & Shell Layouts
- **AppShell (`/components/layout/AppShell.tsx`)**: Baseline layout for public system inspection pages (`/foundation`, `/design-system`, `/modules`, `/health`).
- **CitizenShell (`/components/layout/CitizenShell.tsx`)**: Dedicated navigation framework for citizens featuring top navigation, quick intake launcher, notifications tray, and profile switcher.
- **OrgShell (`/components/layout/OrgShell.tsx`)**: Enterprise layout for organization personnel featuring a collapsible left sidebar, active triage counts, team switcher, and organizational settings.
- **ProtectedRoute (`/components/auth/ProtectedRoute.tsx`)**: Guard component verifying authentication and restricting route access based on user roles (`CITIZEN`, `ORGANIZATION_AGENT`, `ORGANIZATION_ADMIN`, `SUPER_ADMIN`).

### 11.3 Citizen Portal Pages
- `/` — **SplashScreen (`SplashScreen.tsx`)**: Landing page showcasing CPET value proposition, platform metrics, and single-click access for citizens and organizations.
- `/citizen/login` & `/citizen/signup` — **Citizen Auth (`CitizenLogin.tsx`, `CitizenSignup.tsx`)**: Clean authentication flows with email/password and phone verification.
- `/citizen/home` — **CitizenHome (`CitizenHome.tsx`)**: Dashboard displaying recent active cases, quick action cards (AI Intake, New Request, Blood Hub), and direct status trackers.
- `/citizen/intake` — **CitizenAiIntake (`CitizenAiIntake.tsx`)**: Conversational interface enabling natural text and audio inputs with dynamic question-answering widgets.
- `/citizen/requests` — **CitizenMyRequests (`CitizenMyRequests.tsx`)**: Filterable request list separated into Active, Pending Action, Resolved, and Closed tabs.
- `/citizen/requests/:id` — **CitizenCaseDetails (`CitizenCaseDetails.tsx`)**: Full case tracker with real-time two-way chat, attachment downloaders, SLA countdown clock, resolution confirmation cards, and 5-star rating submission forms.
- `/citizen/blood` — **CitizenBloodHub (`CitizenBloodHub.tsx`)**: 5-level geographic blood availability search, emergency blood requirement case generator, and voluntary donor registry dashboard.
- `/citizen/profile` — **CitizenProfile (`CitizenProfile.tsx`)**: Personal profile editor and notification preferences.

### 11.4 Organization Workspace Pages
- `/organization/login` — **OrgLogin (`OrgLogin.tsx`)**: Specialist and administrative login portal.
- `/organization/dashboard` — **OrgDashboard (`OrgDashboard.tsx`)**: Executive command center featuring **7 real live metric cards** (Total Requests, New, Submitted, In Progress, Waiting, Resolved, Escalated), SLA compliance percentage, and recent case queue.
- `/organization/requests` — **OrgRequestQueue (`OrgRequestQueue.tsx`)**: High-density triage table with status filters, priority flags, search, and quick assignment dropdowns.
- `/organization/requests/:id` — **OrgRequestDetails (`OrgRequestDetails.tsx`)**: Operational triage workbench with case timeline, two-way communication channel, internal team notes, status transition controls, and resolution filing.
- `/organization/team` — **OrgTeam (`OrgTeam.tsx`)**: Team roster management with member invitation and role assignment.
- `/organization/settings` — **OrgSettings (`OrgSettings.tsx`)**: Configuration of organizational SLA hours, auto-assignment rules, category mappings, and contact channels.

---

## 12. Backend

### 12.1 Core Services & Middleware Architecture
The backend application is initialized via `createApp()` in `backend/src/app.ts`:
1. **Security Layer**: `setupHelmet()` applies hardened security headers; `setupCors()` validates origins against whitelist configuration.
2. **Tracing Layer**: `correlationIdMiddleware` assigns a unique UUID to `req.correlationId` and stamps `x-correlation-id` on responses.
3. **Payload Sanitization**: `nosqlSanitizer` and `xssSanitizer` inspect body, query, and params to neutralize malicious selectors or script injections.
4. **Rate Limiting Layer**: Multi-tiered rate limiters applied globally and selectively to sensitive endpoints.
5. **Route Mapping**: Mounts health probes at `/health` and API modules at `/api/v1`.
6. **Centralized Error Handler (`errorHandler.ts`)**: Catches all errors, maps Zod validation failures to standard `400 VALIDATION_ERROR`, handles Mongoose duplicate key errors (`409 CONFLICT`), and masks internal 500 error stack traces in production.

### 12.2 In-Memory Store & Database Resilience Pattern
- **Location**: `backend/src/infrastructure/store.ts`
- **Resilience Strategy**: CPET incorporates a dual-mode persistence architecture:
  - In full production with MongoDB and Redis running, operations commit directly to MongoDB collections and publish to Redis streams.
  - In local development, unit testing, or during container initialization before database daemons finish startup, the backend automatically transitions to an in-memory repository (`MemoryStore`).
  - Standard seed fixtures (Apex Consumer Authority, Lloyd Havells Support, verified test users) are pre-loaded to ensure uninterrupted testing and zero service crashes.

### 12.3 Background Jobs & Queue Workers
- **Location**: `backend/src/modules/escalation/escalation.queue.ts`
- **Queue Architecture**: Implemented with **BullMQ** over Redis.
- **Jobs**:
  - `sla-check`: Evaluates open cases against SLA milestone timestamps.
  - `escalation-dispatch`: Triggered when an SLA deadline is breached, reassigning the case to supervisory tiers and notifying managers.
  - `periodic-sweep`: Runs every 5 minutes to audit all active cases for impending deadlines.

---

## 13. API Documentation

### 13.1 System Health & Diagnostics

#### `GET /health/live`
- **Purpose**: Liveness probe confirming process availability.
- **Authentication**: Public.
- **Response**: `200 OK`
  ```json
  { "status": "ok", "uptimeSeconds": 1420, "timestamp": "2026-09-14T13:40:00.000Z" }
  ```

#### `GET /health/ready`
- **Purpose**: Readiness probe checking MongoDB, Redis, and Queue connectivity.
- **Authentication**: Public.
- **Response**: `200 OK` (or `503 Service Unavailable` if degraded)
  ```json
  {
    "status": "ready",
    "timestamp": "2026-09-14T13:40:00.000Z",
    "services": {
      "database": { "status": "connected", "latencyMs": 2 },
      "redis": { "status": "connected", "latencyMs": 1 }
    }
  }
  ```

---

### 13.2 Authentication Module (`/api/v1/auth`)

#### `POST /api/v1/auth/citizen/signup`
- **Purpose**: Register a new citizen account.
- **Authentication**: Public.
- **Request Body**:
  ```json
  {
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "password": "Password123!",
    "phone": "+91 9876543210"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Citizen registered successfully.",
    "data": { "userId": "66d000000000000000000010", "email": "jane@example.com", "role": "CITIZEN" }
  }
  ```
- **Errors**: `400 VALIDATION_ERROR`, `409 CONFLICT` (email already exists).

#### `POST /api/v1/auth/organization/signup`
- **Purpose**: Register an organization admin and organization record.
- **Authentication**: Public.
- **Request Body**:
  ```json
  {
    "orgName": "Havells Lloyd Support",
    "category": "Consumer Electronics",
    "adminName": "John Manager",
    "adminEmail": "manager@lloyd.in",
    "password": "Password123!",
    "phone": "+91 9876543211"
  }
  ```
- **Response**: `201 Created`

#### `POST /api/v1/auth/login`
- **Purpose**: Authenticate user and issue JWT tokens.
- **Authentication**: Public.
- **Request Body**:
  ```json
  { "email": "citizen@cpet.org", "password": "Password123!" }
  ```
- **Response**: `200 OK` (Sets secure `refreshToken` HTTP-only cookie)
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "66d000000000000000000030", "email": "citizen@cpet.org", "role": "CITIZEN", "name": "Verified Citizen" },
      "token": "<JWT_ACCESS_TOKEN>"
    }
  }
  ```
- **Errors**: `401 INVALID_CREDENTIALS`, `429 TOO_MANY_REQUESTS`.

#### `POST /api/v1/auth/otp/request`
- **Purpose**: Request SMS/Email OTP for login or password reset.
- **Authentication**: Public.
- **Request Body**: `{ "target": "+91 9876543210", "purpose": "LOGIN" }`
- **Response**: `200 OK`

#### `POST /api/v1/auth/otp/verify`
- **Purpose**: Verify OTP code and return auth session.
- **Authentication**: Public.
- **Request Body**: `{ "target": "+91 9876543210", "code": "123456", "purpose": "LOGIN" }`
- **Response**: `200 OK`

#### `POST /api/v1/auth/refresh`
- **Purpose**: Issue new access token using refresh token.
- **Authentication**: Cookie or Refresh Token Body.
- **Response**: `200 OK` `{ "success": true, "token": "<NEW_JWT>" }`

#### `POST /api/v1/auth/logout`
- **Purpose**: Invalidate active session and clear cookies.
- **Authentication**: Authenticated.
- **Response**: `200 OK`

---

### 13.3 AI Intake Module (`/api/v1/ai`)

#### `POST /api/v1/ai/analyze`
- **Purpose**: Conversational analysis of user request narrative.
- **Authentication**: Public (Rate-limited).
- **Request Body**:
  ```json
  { "narrative": "I have a Lloyd AC and it needs servicing." }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "intent": "SERVICE_REQUEST",
      "confidence": 0.96,
      "brand": "Lloyd",
      "product": "Air Conditioner",
      "category": "Consumer Electronics",
      "suggestedOrganizationId": "66d000000000000000000002",
      "missingFields": ["location", "serviceType", "preferredDate"],
      "structuredPayload": {
        "title": "Periodic Service Request for Lloyd Air Conditioner",
        "category": "Consumer Electronics",
        "productService": "Lloyd Air Conditioner"
      }
    }
  }
  ```

#### `POST /api/v1/ai/voice`
- **Purpose**: Audio voice transcription and structured extraction.
- **Authentication**: Public (Rate-limited).
- **Request Body**: Multipart form data with `audio` file.
- **Response**: `200 OK`

---

### 13.4 Case Management Module (`/api/v1/cases`)

#### `POST /api/v1/cases`
- **Purpose**: Submit a new universal case.
- **Authentication**: Required (`CITIZEN`, `DONOR`, `SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "type": "SERVICE_REQUEST",
    "title": "Lloyd AC Periodic Service",
    "description": "Lloyd AC blowing warm air, requires filter cleaning and gas check.",
    "category": "Consumer Electronics",
    "organizationId": "66d000000000000000000002",
    "priority": "MEDIUM",
    "location": { "city": "Delhi", "state": "Delhi", "pincode": "110001" },
    "structuredData": { "model": "Lloyd Inverter 1.5T", "serialNumber": "LLD-9921" }
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Case created successfully.",
    "data": {
      "_id": "6aa7fd179f404888633c964b",
      "referenceNumber": "CPET-2026-44537",
      "status": "SUBMITTED",
      "sla": { "dueAt": "2026-09-16T13:40:00.000Z", "slaHours": 48 }
    }
  }
  ```

#### `GET /api/v1/cases/my`
- **Purpose**: Retrieve cases raised by the authenticated citizen.
- **Authentication**: Required (`CITIZEN`, `DONOR`).
- **Query Parameters**: `status` (optional), `page` (default 1), `limit` (default 20).
- **Response**: `200 OK`

#### `GET /api/v1/cases/organization/:orgId`
- **Purpose**: Retrieve cases assigned to an organization tenant.
- **Authentication**: Required (`ORGANIZATION_ADMIN`, `ORGANIZATION_AGENT`, strict tenant scope).
- **Response**: `200 OK`

#### `GET /api/v1/cases/:id`
- **Purpose**: Retrieve full case details, timeline events, and allowed transitions.
- **Authentication**: Required (Requester, Assigned Org Staff, or Admin).
- **Response**: `200 OK`

#### `POST /api/v1/cases/:id/transition`
- **Purpose**: Advance case status through the State Machine.
- **Authentication**: Required.
- **Request Body**:
  ```json
  { "toStatus": "IN_PROGRESS", "notes": "Technician dispatched to citizen address." }
  ```
- **Response**: `200 OK`
- **Errors**: `400 INVALID_STATE_TRANSITION`, `409 CONFLICT` (version mismatch).

#### `POST /api/v1/cases/:id/assign`
- **Purpose**: Assign an internal staff member to a case.
- **Authentication**: Required (`ORGANIZATION_ADMIN`, `SUPER_ADMIN`).
- **Request Body**: `{ "agentId": "66d000000000000000000032" }`
- **Response**: `200 OK`

#### `POST /api/v1/cases/:id/messages`
- **Purpose**: Post a message or document attachment to the case timeline.
- **Authentication**: Required (Citizen or Org Staff).
- **Request Body**:
  ```json
  { "message": "Hello, technician is arriving at 10 AM.", "isInternal": false }
  ```
- **Response**: `201 Created`

#### `POST /api/v1/cases/:id/read`
- **Purpose**: Mark case messages as read.
- **Authentication**: Required.
- **Response**: `200 OK`

#### `POST /api/v1/cases/:id/feedback`
- **Purpose**: Citizen submits satisfaction rating & review on a resolved case.
- **Authentication**: Required (`CITIZEN`, Requester only).
- **Request Body**:
  ```json
  { "rating": 5, "comments": "Prompt and professional technician service!" }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Feedback submitted successfully.",
    "data": { "rating": 5, "comments": "Prompt and professional technician service!", "submittedAt": "2026-09-14T14:10:00.000Z" }
  }
  ```

---

### 13.5 Organization Module (`/api/v1/organizations`)

#### `GET /api/v1/organizations`
- **Purpose**: Public directory of verified organizations.
- **Authentication**: Public.
- **Response**: `200 OK`

#### `GET /api/v1/organizations/:orgId`
- **Purpose**: Public profile of an organization.
- **Authentication**: Public.
- **Response**: `200 OK`

#### `GET /api/v1/organizations/:orgId/dashboard`
- **Purpose**: Executive metrics with strict tenant isolation (zero dummy numbers).
- **Authentication**: Required (`ORGANIZATION_ADMIN`, `ORGANIZATION_AGENT`, strict tenant scope).
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "tenant": { "id": "66d000000000000000000002", "name": "Lloyd (Havells Consumer Appliances)" },
    "data": {
      "totalRequests": 1,
      "newRequests": 1,
      "submitted": 1,
      "inProgress": 0,
      "waiting": 0,
      "resolved": 0,
      "escalated": 0,
      "recentCases": [...],
      "slaComplianceRate": "100%",
      "defaultSlaHours": 48
    }
  }
  ```

#### `GET /api/v1/organizations/:orgId/requests`
- **Purpose**: Tenant request queue.
- **Authentication**: Required (Org staff, tenant scope).
- **Response**: `200 OK`

#### `GET /api/v1/organizations/:orgId/members`
- **Purpose**: Team roster.
- **Authentication**: Required (Org staff, tenant scope).
- **Response**: `200 OK`

#### `POST /api/v1/organizations/:orgId/members`
- **Purpose**: Add team member.
- **Authentication**: Required (`ORGANIZATION_ADMIN`, tenant scope).
- **Request Body**: `{ "name": "Alex Tech", "email": "alex@lloyd.in", "role": "ORGANIZATION_AGENT" }`
- **Response**: `201 Created`

#### `PATCH /api/v1/organizations/:orgId/settings`
- **Purpose**: Update organization settings (default SLA, autoAssign).
- **Authentication**: Required (`ORGANIZATION_ADMIN`, tenant scope).
- **Response**: `200 OK`

---

### 13.6 Emergency Blood & Donor Module (`/api/v1/blood`)

#### `GET /api/v1/blood/search`
- **Purpose**: Search blood availability across 5-level geographic hierarchy.
- **Authentication**: Public.
- **Query Parameters**: `bloodGroup` (Required, e.g. `O+`), `locality`, `municipality`, `subDistrict`, `district`, `state`, `radiusKm`.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "bloodGroup": "O+",
      "totalDiscovered": 4,
      "hierarchy": {
        "level1_locality": [],
        "level2_municipality": [
          { "anonymousDonorCode": "DONOR-HYD-1001", "bloodGroup": "O+", "availabilityStatus": "AVAILABLE", "distanceKm": 4.2 }
        ],
        "level3_subDistrict": [
          { "anonymousDonorCode": "DONOR-HYD-1003", "bloodGroup": "O+", "availabilityStatus": "AVAILABLE", "distanceKm": 18.5 }
        ],
        "level4_district": [],
        "level5_state": []
      }
    }
  }
  ```

#### `POST /api/v1/blood/donors/register`
- **Purpose**: Register as a voluntary blood donor.
- **Authentication**: Required (`CITIZEN`, `DONOR`).
- **Request Body**:
  ```json
  {
    "bloodGroup": "O+",
    "contactPhone": "+91 9876543210",
    "approximateLocation": { "municipality": "Delhi", "state": "Delhi" }
  }
  ```
- **Response**: `201 Created` (Returns unique `anonymousDonorCode`).

#### `GET /api/v1/blood/donors/me`
- **Purpose**: Get current user's donor registration profile.
- **Authentication**: Required.
- **Response**: `200 OK`

#### `PUT /api/v1/blood/donors/status`
- **Purpose**: Update donor availability (`AVAILABLE`, `UNAVAILABLE`, `COOLDOWN`).
- **Authentication**: Required.
- **Response**: `200 OK`

#### `POST /api/v1/blood/contact`
- **Purpose**: Dispatch emergency alert relay to donor anonymously.
- **Authentication**: Required.
- **Request Body**:
  ```json
  {
    "anonymousDonorCode": "DONOR-HYD-1001",
    "hospitalName": "City General Hospital ICU",
    "unitsNeeded": 2,
    "attendantPhone": "+91 9988776655",
    "urgency": "CRITICAL_IMMEDIATE"
  }
  ```
- **Response**: `200 OK`

---

### 13.7 SLA & Escalation Module (`/api/v1/sla`)

#### `GET /api/v1/sla/policies`
- **Purpose**: Retrieve active SLA policies.
- **Authentication**: Required.
- **Response**: `200 OK`

#### `GET /api/v1/sla/cases/:id/evaluate`
- **Purpose**: Real-time SLA countdown and milestone audit.
- **Authentication**: Required.
- **Response**: `200 OK`

#### `POST /api/v1/sla/cases/:id/escalate`
- **Purpose**: Manual supervisor escalation override.
- **Authentication**: Required (`ORGANIZATION_ADMIN`, `SUPER_ADMIN`).
- **Request Body**: `{ "reason": "Consumer complaint unresolved past 24 hours" }`
- **Response**: `200 OK`

#### `POST /api/v1/sla/sweep`
- **Purpose**: Trigger an immediate escalation sweep across all open cases.
- **Authentication**: Required (`SUPER_ADMIN`, `CPET_ADMIN`).
- **Response**: `200 OK`

---

## 14. Authentication

### 14.1 Authentication & Session Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Application
    participant Auth as Auth Controller
    participant DB as User / Session DB
    participant JWT as Crypto JWT Engine

    User->>Auth: POST /api/v1/auth/login (email, password)
    Auth->>DB: Query User by Email (include passwordHash)
    DB-->>Auth: User record found
    Auth->>Auth: bcrypt.compare(password, passwordHash)
    Auth->>JWT: Generate Access Token (15m expiry, role, userId, orgId)
    Auth->>JWT: Generate Refresh Token (7d expiry)
    Auth->>DB: Store hashed refresh token in sessions collection (TTL)
    Auth-->>User: Set-Cookie: refreshToken (HttpOnly, Secure, SameSite)<br/>Body: { token: "<ACCESS_JWT>", user: {...} }
    
    Note over User,Auth: Subsequent API Requests include 'Authorization: Bearer <ACCESS_JWT>'
    
    User->>Auth: POST /api/v1/auth/refresh
    Auth->>DB: Validate session in DB by hashed refreshToken
    Auth->>JWT: Issue new Access Token
    Auth-->>User: Body: { token: "<NEW_ACCESS_JWT>" }
```

### 14.2 Role-Based Access Control (RBAC) Matrix

| Endpoint Area | `CITIZEN` / `DONOR` | `ORGANIZATION_AGENT` | `ORGANIZATION_ADMIN` | `CPET_ADMIN` / `SUPER_ADMIN` |
| :--- | :---: | :---: | :---: | :---: |
| **Raise Cases** (`POST /cases`) | **ALLOW** | DENY | DENY | **ALLOW** |
| **View My Cases** (`GET /cases/my`) | **ALLOW** | DENY | DENY | **ALLOW** |
| **Org Dashboard** (`GET /org/:id/dashboard`) | DENY | **ALLOW** (Scoped) | **ALLOW** (Scoped) | **ALLOW** (Global) |
| **Triage Queue** (`GET /org/:id/requests`) | DENY | **ALLOW** (Scoped) | **ALLOW** (Scoped) | **ALLOW** (Global) |
| **Advance Status** (`POST /cases/:id/transition`)| DENY | **ALLOW** | **ALLOW** | **ALLOW** |
| **Confirm & Rating** (`POST /cases/:id/feedback`)| **ALLOW** (Requester) | DENY | DENY | DENY |
| **Manage Team** (`POST /org/:id/members`) | DENY | DENY | **ALLOW** (Scoped) | **ALLOW** (Global) |
| **Blood Search** (`GET /blood/search`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| **Manual Escalation** (`POST /sla/cases/:id/escalate`)| DENY | DENY | **ALLOW** | **ALLOW** |

### 14.3 Multi-Tenant Scope Isolation
Multi-tenancy is enforced at the controller and middleware level via `tenantScope`:
```typescript
// backend/src/middleware/auth.ts
export function tenantScope(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const targetOrgId = req.params.orgId || req.body.organizationId;
  
  if (user.role === 'SUPER_ADMIN' || user.role === 'CPET_ADMIN') {
    return next(); // Platform administrators bypass local tenant scope
  }
  
  if (user.organizationId !== targetOrgId) {
    throw new ForbiddenError('Tenant isolation violation: Access denied to foreign organization data.');
  }
  next();
}
```

---

## 15. Real-Time Communication

### 15.1 Socket.IO Infrastructure & Channel Architecture
The real-time gateway is initialized on the Node.js HTTP server (`backend/src/infrastructure/socket.ts`).
- **Connection Handshake**: Authenticated via JWT bearer token in `auth.token`.
- **Channel Partitioning**:
  - `user:<userId>`: Private channel for citizen status updates, direct alerts, and read receipts.
  - `org:<organizationId>`: Triage channel broadcast to all active agents when new tickets arrive.
  - `case:<caseId>`: Active collaboration room for citizens and assigned support specialists discussing a specific ticket.

### 15.2 Event Protocols & Sequences

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen Client
    participant Socket as Socket.IO Server
    actor Agent as Organization Agent

    Citizen->>Socket: emit("case:join", caseId)
    Agent->>Socket: emit("case:join", caseId)
    
    Agent->>Socket: POST /api/v1/cases/:id/messages
    Socket->>Citizen: emitToCase(caseId, "case:message", { sender: "Org", text: "..." })
    Socket->>Agent: emitToCase(caseId, "case:message", { sender: "Org", text: "..." })
    
    Citizen->>Socket: POST /api/v1/cases/:id/read
    Socket->>Agent: emitToCase(caseId, "case:read", { readBy: citizenId, time: "..." })
    
    Agent->>Socket: POST /api/v1/cases/:id/transition (RESOLVED)
    Socket->>Citizen: emitToUser(citizenId, "case:transitioned", { newStatus: "RESOLVED" })
```

---

## 16. Testing

### 16.1 Test Suite Breakdown & Verification Results
The test suite is built on **Vitest** and executed via `npm test --workspace=backend`. All **11 test suites** passed with a **100% pass rate (79/79 passing tests)**:

| Test Suite File | Tests | Focus Area | Status |
| :--- | :---: | :--- | :---: |
| `case.service.test.ts` | 14 | Case lifecycle, state transitions, ownership, feedback | **PASS** |
| `integration-qa.test.ts` | 10 | End-to-end user journey, Lloyd AC routing, Blood 5-tier search, rate limits | **PASS** |
| `auth.test.ts` | 9 | Password hashing, token refresh, OTP verification, brute-force limits | **PASS** |
| `sla.service.test.ts` | 8 | Milestone calculation, breach timers, holiday calendar handling | **PASS** |
| `escalation.queue.test.ts` | 7 | Delayed queue dispatch, supervisory escalation triggers, event logs | **PASS** |
| `blood.service.test.ts` | 7 | Geospatial proximity calculations, anonymous proxy shielding | **PASS** |
| `security.test.ts` | 6 | NoSQL injection rejection, XSS sanitization, Helmet headers, CORS | **PASS** |
| `organization.test.ts` | 5 | Tenant isolation, member roster management, settings persistence | **PASS** |
| `routing.test.ts` | 5 | Deterministic brand matching, jurisdiction fallback | **PASS** |
| `audit.test.ts` | 4 | Immutable audit ledger logging and actor stamping | **PASS** |
| `schema.engine.test.ts` | 4 | Dynamic domain schema validation and required field verification | **PASS** |
| **Total** | **79** | **Complete System Verification** | **100% PASS** |

### 16.2 Load Runner & High-Throughput Verification
A dedicated load-testing runner ([backend/src/tests/load-runner.ts](file:///c:/Users/Sai%20Raghu%20Charan/Desktop/react/backend/src/tests/load-runner.ts)) executed four high-concurrency scenarios:
- **Baseline Health Check**: Sustained **2,862 requests/sec** (p50: 1.2ms, p99: 4.8ms, 0% errors).
- **Public Directory Discovery**: Sustained **1,940 requests/sec** (p50: 1.8ms, p99: 6.2ms, 0% errors).
- **Case Tracking Inquiries**: Sustained **1,420 requests/sec** (p50: 2.4ms, p99: 8.1ms, 0% errors).
- **Concurrent Intake Processing**: Sustained **920 requests/sec** (p50: 4.1ms, p99: 12.5ms, 0% errors).

---

## 17. Deployment

### 17.1 Containerization & Docker Orchestration
The project is containerized using multi-stage Dockerfiles and orchestrated with `docker-compose.prod.yml`:

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.prod.yml                  │
│                                                             │
│  ┌────────────────────────┐     ┌────────────────────────┐  │
│  │   cpet-prod-mongodb    │     │    cpet-prod-redis     │  │
│  │       mongo:7.0        │     │    redis:7.2-alpine    │  │
│  │   Port: 27017 (Int)    │     │    Port: 6379 (Int)    │  │
│  └───────────┬────────────┘     └───────────┬────────────┘  │
│              │                              │               │
│              └──────────────┬───────────────┘               │
│                             ▼                               │
│             ┌───────────────────────────────┐               │
│             │       cpet-prod-backend       │               │
│             │     Node.js 20 Alpine API     │               │
│             │       Port: 5000 (Int)        │               │
│             └───────────────┬───────────────┘               │
│                             ▼                               │
│             ┌───────────────────────────────┐               │
│             │       cpet-prod-frontend      │               │
│             │    Nginx 1.27 Static + Proxy  │               │
│             │       Port: 80 / 443 (Ext)    │               │
│             └───────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

- **Backend Dockerfile (`backend/Dockerfile`)**:
  - *Stage 1 (Builder)*: Node 20 Alpine installs dependencies and compiles TypeScript workspaces (`database` and `backend`).
  - *Stage 2 (Runner)*: Non-root user `node` copies built dist and production node_modules, exposes port 5000, and includes health probe `wget --spider http://localhost:5000/health`.
- **Frontend Dockerfile (`frontend/Dockerfile`)**:
  - *Stage 1 (Builder)*: Builds static production bundle using Vite.
  - *Stage 2 (Runner)*: Nginx 1.27 Alpine serves static assets, enforces security headers, enables Gzip, and reverse-proxies `/api` and `/socket.io` to backend container.

### 17.2 Continuous Integration (CI/CD) Pipeline
Configured in `.github/workflows/ci.yml`:
1. **Lint & Typecheck Job**: Runs `npm run typecheck` across all 3 workspaces and `npm run lint`.
2. **Test Job**: Launches MongoDB 7.0 and Redis 7.2 service containers, executes `npm test` across database, backend, and frontend.
3. **Load Runner Job**: Compiles backend and runs `npm run test:load` to verify sub-second latency thresholds.
4. **Build & Package Job**: Executes `npm run build` and runs `docker compose -f docker-compose.prod.yml config` to validate compose integrity.

### 17.3 Production Hardening & Operations Runbook
- **Secret Generation**: Production secrets (`JWT_SECRET`, `COOKIE_SECRET`) must be generated via `openssl rand -base64 32`.
- **Database Backup Schedule**: Daily `mongodump` cron script configured in `DEPLOYMENT.md` with 30-day retention and point-in-time recovery (PITR).
- **Zero-Downtime Rolling Update**:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build --no-deps backend frontend
  ```

---

## 18. Screenshots

*The following images represent actual verification screenshots captured during live browser sessions on the running application:*

### 1. Landing Screen & Splash Gateway
*The initial entry point providing one-click access for citizens, organizations, and system architects.*
![CPET Landing Screen](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/cpet_landing_screen_1789393642495.png)

---

### 2. Case Creation via AI-First Intake
*Case reference `CPET-2026-44537` created after conversational NLP extraction for Lloyd AC servicing.*
![Case Created via AI Intake](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/cpet_case_created_1789394271006.png)

---

### 3. Organization Dashboard (Strict Tenant Isolation)
*Lloyd Support Specialist view with 7 real live metric cards, SLA compliance rate, and zero dummy rows.*
![Organization Dashboard](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/org_dashboard_1789394434147.png)

---

### 4. Two-Way Discussion & Case Resolution
*Organization specialist dispatch message and state machine transition to RESOLVED.*
![Resolved Case Details](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/resolved_case_details_1789394790144.png)

---

### 5. Citizen Resolution Confirmation & 5-Star Feedback
*Citizen confirms technician resolution, submits 5-star rating and review, advancing case to CLOSED.*
![Citizen Feedback and Closure](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/citizen_case_closed_feedback_1789395076232.png)

---

### 6. Emergency Blood 5-Level Geographic Discovery
*Search results categorized across Locality, Municipality, Sub-District, District, and State with masked donor privacy.*
![Blood Hub Discovery](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/blood_hub_discovery_1789395632377.png)

---

### 7. Emergency Blood Requirement Form
*Critical hospital blood requirement case intake with 6-hour emergency SLA.*
![Blood Hub Request Form](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/blood_hub_request_form_1789395732073.png)

---

### 8. Voluntary Donor Registry & Privacy Controls
*Donor profile dashboard displaying anonymous donor code and availability toggle.*
![Blood Hub Profile](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/blood_hub_profile_1789395804167.png)

---

### 9. Mobile Viewport Responsiveness (375x667)
*Seamless mobile layout with responsive drawer navigation and optimized touch controls.*
![Mobile Viewport](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/mobile_citizen_home_1789395842343.png)

---

### 10. Tablet Viewport Responsiveness (768x1024)
*Tablet layout demonstrating fluid two-column card organization.*
![Tablet Viewport](file:///C:/Users/Sai%20Raghu%20Charan/.gemini/antigravity-ide/brain/628649e6-92d6-4e54-bad9-9753260c1959/tablet_citizen_home_1789395847930.png)

---

## 19. Limitations

### 19.1 Current Implementation Limitations
1. **Mocked Third-Party SMS/Email Gateways**: While the internal notification bus and Socket.IO real-time channels are operational, external outbound SMS (e.g. Twilio) and transactional email (e.g. SendGrid) are simulated in memory unless production API keys are configured.
2. **Single-Node MongoDB Transactions**: The local development and default Docker Compose configurations utilize a single MongoDB node. MongoDB multi-document ACID transactions require a configured replica set (`rs.initiate()`) in high-availability enterprise staging.
3. **Local File System Attachments**: Uploaded attachments are persisted to local directory volumes rather than distributed S3-compatible cloud object stores (e.g. AWS S3 / MinIO).
4. **LLM Dependency on Fallback**: In offline or rate-limited environments, natural language parsing utilizes the deterministic keyword and rule-based extractor rather than deep neural LLM inference.

---

## 20. Future Enhancements

The following extensions are planned for post-release iterations:
1. **S3/MinIO Cloud Storage Integration**: Implement presigned URL uploads for attachments, offloading file handling from API servers directly to cloud storage buckets.
2. **Multilingual Speech-to-Text (Indic Voices)**: Integrate Whisper or Google Speech APIs supporting regional dialects (Hindi, Telugu, Tamil, Kannada) for rural citizen intake.
3. **Automated WhatsApp / Telegram Bot Gateway**: Allow citizens to raise and track cases directly via conversational chat apps without opening a web browser.
4. **Predictive SLA Breach Analytics**: Train machine learning regression models on historic resolution durations to flag cases at risk of breach immediately upon intake.
5. **Government Service Bus (Open311) Connectors**: Native bi-directional synchronization with municipal Open311 and national grievance portals (e.g., CPGRAMS).

---

## 21. Conclusion

The **CPET (Consumer Problem Escalation & Tracking)** platform establishes a modern standard for citizen-to-organization engagement. By uniting an AI-First intake philosophy with a deterministic state machine, strict multi-tenant isolation, real-time WebSocket communication, and automated BullMQ escalation queues, CPET eliminates the systemic frictions that plague traditional grievance and support systems.

Verified through comprehensive automated unit and integration tests (100% pass rate across 79 tests), sustained high-throughput benchmarking (2,862 req/s peak), and verified cross-device browser QA, CPET provides a robust, transparent, and production-ready foundation for enterprise grievance management and emergency service delivery.
