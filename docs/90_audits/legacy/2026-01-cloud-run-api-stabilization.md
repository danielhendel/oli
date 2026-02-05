# Cloud Run API Stabilization & Derived Ledger Replay  
**Audit Context Document — January 2026**

> ⚠️ **Audit Note (Important)**
>
> This document is **informational and non-authoritative**.
>  
> The **source of truth** is the codebase, infrastructure configuration, and deployed Cloud Run service state.
>  
> This document exists solely to explain **intent, architectural decisions, invariants, and corrective actions**
> taken during the January 2026 Cloud Run API stabilization and Derived Ledger Replay rollout, in order to
> support a full end-to-end audit and reduce ambiguity during review.

---

## 1. Scope of This Document

This document covers:

- Stabilization of the `oli-api` Cloud Run service
- Resolution of build and runtime failures
- Canonicalization of contract imports (`@oli/contracts`)
- Introduction of Derived Ledger replay read endpoints
- Health and readiness endpoint clarification
- IAM, ingress, and invocation model validation
- Build, deploy, and runtime invariants

This document **does not** define API contracts, schemas, or business logic.
Those are defined in code and OpenAPI specifications.

---

## 2. System Overview

### Service
- **Name:** `oli-api`
- **Platform:** Google Cloud Run
- **Region:** `us-central1`
- **Runtime:** Node.js 20
- **Auth Model:** Firebase ID Token (Bearer)
- **Primary Role:** Authenticated ingestion + read-only health and analytics APIs

### High-Level Architecture

Clients
├── Mobile App
├── Web App
└── CLI / Internal Tools
│
▼
Cloud Run (oli-api)
├── /ingest (authenticated write boundary)
├── /users/me/* (authenticated read boundary)
├── /health (public)
├── /ready (public)
└── /health/auth (authenticated)
│
▼
Firestore (user-scoped collections)
│
▼
Derived Ledger Pipeline (async, event-driven)

yaml
Copy code

---

## 3. Root Cause Summary (Why Stabilization Was Required)

During deployment of the Derived Ledger Replay feature, the service experienced:

1. **Cloud Run startup failures**
2. **`MODULE_NOT_FOUND: @oli/contracts` at runtime**
3. **Health check ambiguity (`/healthz` vs `/health`)**
4. **Artifact Registry permission failures**
5. **Ingress and IAM confusion during validation**

These were **not logic bugs**, but **build, packaging, and deployment boundary issues**.

---

## 4. Contract Resolution Strategy (`@oli/contracts`)

### Problem

TypeScript path aliases (`@oli/contracts`) worked in development but failed in Cloud Run runtime because:

- `tsc` does **not rewrite path aliases**
- Node.js runtime has no awareness of TS `paths`
- Contracts were not an installed npm package

### Resolution

Contracts were **vendored into the service** under:

services/api/lib/contracts/*

yaml
Copy code

With:
- Explicit TypeScript compilation
- Runtime-resolvable CommonJS output
- Stable import paths

### Resulting Invariant

> All imports of `@oli/contracts/*` resolve at runtime **without bundlers, symlinks, or path rewriting**.

This eliminates:
- Runtime alias resolution
- Hidden build-time coupling
- Cloud Run startup failures

---

## 5. TypeScript & Build Configuration Changes

### Key Decisions

- Introduced `tsconfig.base.json` for shared compiler invariants
- Explicitly included `lib/contracts/**/*.ts` in compilation
- Ensured `outDir=dist` mirrors source structure
- Maintained `CommonJS` output for Node.js 20

### Non-Goals

- No bundling (Webpack / esbuild intentionally avoided)
- No runtime transpilation
- No experimental module resolution

---

## 6. Docker & Cloud Run Runtime Invariants

### Dockerfile Guarantees

- Multi-stage build (`deps → build → run`)
- `npm ci` for deterministic installs
- Only compiled JS copied to runtime image
- No dev dependencies at runtime
- Explicit `CMD ["node", "dist/src/server.js"]`

### Cloud Run Expectations

- Service listens on `PORT=8080`
- TCP startup probe only (no HTTP health probe required)
- Startup CPU boost enabled
- Max scale bounded

---

## 7. Health & Readiness Endpoints

### Intentional Design

| Endpoint | Auth | Purpose |
|-------|------|--------|
| `/health` | ❌ | Public liveness |
| `/ready` | ❌ | Public readiness |
| `/health/auth` | ✅ | Auth + Firebase token validation |
| `/healthz` | ❌ | **Not used intentionally** |

### Rationale

- Cloud Run **does not require** `/healthz`
- TCP probe already verifies port readiness
- Public health endpoints must **never require auth**
- Authenticated health validates IAM + Firebase config

### Audit Invariant

> Health endpoints must always return structured JSON and never HTML.

---

## 8. IAM & Ingress Model

### Ingress

run.googleapis.com/ingress: all

yaml
Copy code

This allows:
- Public access for health endpoints
- Auth-gated access at application layer

### Invocation

- `roles/run.invoker` granted to:
  - `allUsers` (for public health + gateway)
  - Runtime service account
  - API Gateway service account

### Security Model

> Network-level access is permissive; **application-level authentication is authoritative**.

This avoids:
- Health check deadlocks
- Gateway misconfiguration
- Cold start failures

---

## 9. Ingestion Boundary (`POST /ingest`)

### Properties

- Authenticated
- Requires idempotency key
- Deterministic Firestore document IDs
- Schema-validated against canonical contracts

### Invariant

> `/ingest` is the **only write entrypoint** into user data.

All other endpoints are read-only.

---

## 10. Derived Ledger Replay (Read-Only)

### Endpoints

- `GET /users/me/derived-ledger/runs`
- `GET /users/me/derived-ledger/replay`

### Guarantees

- Read-only
- User-scoped
- Snapshot-based
- Schema-validated on read
- Defensive against corrupt Firestore documents

### Failure Mode

Invalid stored data results in:
- Structured `500 INVALID_DOC`
- Logged with request ID
- No partial responses

---

## 11. Defensive Validation Strategy

All Firestore reads are validated using Zod schemas derived from contracts.

Invalid data:
- Is treated as **server fault**
- Is never silently ignored
- Is never partially returned

This is intentional for auditability.

---

## 12. Artifact Registry & Build Identity

### Build Identity

- Cloud Build runs as:
1010034434203-compute@developer.gserviceaccount.com

yaml
Copy code

### Required Permission

- `roles/artifactregistry.writer`

This was explicitly granted to resolve push failures.

---

## 13. What Changed (Summary)

### Added
- Vendored contracts under `services/api/lib/contracts`
- Derived Ledger replay endpoints
- Base TypeScript config
- Explicit health/readiness endpoints

### Modified
- Dockerfile
- Package.json
- TypeScript config
- API routes
- OpenAPI spec

### Removed / Avoided
- Runtime TS path alias reliance
- Implicit healthz assumptions
- Unbounded startup behavior

---

## 14. What This Document Is Not

- ❌ A specification
- ❌ A substitute for code review
- ❌ A compliance attestation
- ❌ A security policy

It is **context only**.

---

## 15. Audit Readiness Statement

As of January 2026:

- Service builds deterministically
- Containers start reliably
- Health endpoints are reachable
- IAM permissions are explicit
- Runtime behavior matches intent
- Contracts are versioned and enforced
- Read/write boundaries are strict

All claims in this document can be verified directly in code and Cloud Run configuration.

---
