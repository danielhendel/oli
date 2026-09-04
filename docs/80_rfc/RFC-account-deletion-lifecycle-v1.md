# RFC — Account Deletion Lifecycle v1

**Status:** Accepted — human approval 2026-08-30  
**Stage:** 1C  
**Date:** 2026-08-30  
**Canonical location:** `docs/80_rfc/` (per `docs/INDEX.md`)  
**ADR:** [ADR-account-deletion-lifecycle-v1.md](../70_adrs/ADR-account-deletion-lifecycle-v1.md)

**Persistence authorized:** Yes — Stage 1C deletion mirror + durable ledger only as defined  
**RG-LEGAL-01:** OPEN (unchanged)  
**Consent persistence:** Not in scope  
**Legal assent:** Inactive  

---

## Problem

Stage 1C implements consumer account deletion. The branch introduces:

1. A **user-scoped deletion-status mirror**: `users/{uid}/accountDeletion/{requestId}`
2. A **global durable operation ledger**: `accountDeletions/{uid_requestId}` retained after user subtree and Auth deletion

No approved RFC/ADR authorizes these paths, retention after Auth deletion, fields retained, document-ID format, TTL, access controls, recent-authentication enforcement, or the user-scoped storage exception for the global ledger.

Historical Phase 3A infrastructure audits describe pre-existing delete Functions and `accountDeletions` usage. Audits are not architectural authorization. Consent ADR v1 only states that account deletion is Stage 1C; it does not authorize deletion storage paths.

Silent invention of retention and global paths violates `docs/INDEX.md` change rules (authoritative write paths require RFC → ADR → implementation).

---

## Goals

- Permanent, irreversible account deletion with honest pending semantics
- Server-enforced recent authentication (not client-only reauth UI)
- Idempotent request + worker retry across crash windows
- Auth identity deleted **last**
- Minimal durable ledger for recovery after user subtree removal
- Local lifecycle cleanup that cannot leak Account A into Account B
- No health payload, email, tokens, or export contents in retained records or consumer errors

## Non-goals

- Consent persistence or legal assent activation
- Closing RG-LEGAL-01
- Production deploy
- Export streaming / export coverage closure
- Body / Plan / Progress analytics work
- Indefinite “audit forever” retention

---

## Architecture overview

```text
Mobile: reauthenticate → force-refresh ID token → POST /account/delete
        → local cleanup / recovery marker → deletion-pending UX

Cloud Run API:
  - Verifies Firebase ID token
  - Enforces recent auth_time on POST /account/delete
  - Writes user-scoped request mirror (queued)
  - Upserts durable operation ledger (queued) BEFORE publish
  - Publishes Pub/Sub once (idempotent)
  - Gates normal product APIs while deletion is pending
  - Serves GET /delete/latest and GET /delete/{requestId} while Auth remains

Worker (Pub/Sub):
  integrations → export artifacts → Storage → Firestore subtree
  → Auth delete last → mark ledger completed
```

---

## 1. Request mirror (user-scoped)

| Item | Decision |
|------|----------|
| **Purpose** | Consumer-visible deletion status while the user can still authenticate |
| **Path** | `users/{uid}/accountDeletion/{requestId}` |
| **Status values** | `queued` \| `in_progress` \| `failed` (and briefly `completed` only if mirrored before subtree delete; see order) |
| **Timestamps** | Server-authored only (`updatedAt`, `startedAt`, `completedAt` via Firestore server timestamps). Client may supply opaque ISO `requestedAt` for correlation; server does not trust client clocks for freshness or authorization. |
| **Idempotency** | Client supplies `x-request-id` as `requestId`. Duplicate key returns existing status. Active pending request is reused rather than creating parallel deletions. |
| **Deletion timing** | Removed with the user Firestore subtree **before** Auth deletion. After Auth deletion the mirror is gone. |
| **Read boundary** | Cloud Run only, authenticated UID must match path UID. Consumer app never reads Firestore. Cross-user denied. |
| **Write boundary** | Cloud Run (accept / fail-on-publish) and deletion Function (status progression). Clients never write this path. |

Consumer-facing status DTOs must not expose internal worker step names, Storage paths, UIDs beyond necessity in API JSON (prefer omitting raw UID from mobile-visible payloads where contracts allow), or raw error strings.

---

## 2. Durable operation ledger (global exception)

### Necessity

A durable ledger **is necessary**. After the user Firestore subtree is deleted, the request mirror no longer exists. Crash recovery, Auth-deletion retry, and sanitized operational completion evidence require a record **outside** `users/{uid}/…`.

### When created

The ledger document **must exist before any destructive deletion begins**.

Required order on `POST /account/delete` acceptance:

1. Create / upsert **user-scoped mirror** (`queued`)
2. Create / upsert **durable ledger** (`queued`) — same `requestId`
3. Publish Pub/Sub
4. On publish failure: mark both `failed` with a sanitized error code (e.g. `publish_failed`)

The worker must **not** be the first writer of the only durable recovery evidence. Worker updates the existing ledger through `in_progress` → `completed` / `failed`.

### Why outside the user subtree

User-scoped data is recursively deleted during the same lifecycle. Recovery after that step (especially Auth delete retry) cannot depend on `users/{uid}/…`.

This is an **explicit, narrow exception** to ordinary user-scoped storage rules — not ordinary product storage.

### Path and identifier strategy

| Item | Decision |
|------|----------|
| **Collection** | `accountDeletions` |
| **Document ID** | `{uid}_{requestId}` with `/` sanitized (same pattern as existing `accountExports/{uid_requestId}`) |
| **UID in document ID** | Allowed **only** as this operational join key for Stage 1C, under this RFC/ADR. It is not a license for health content, email, tokens, export bytes, or unbounded logs. |
| **UID field** | Optional operational field for Admin/worker join; same constraints as document ID. |

Future pseudonymization (hashed operation id) may supersede this via a later RFC; Stage 1C does not invent a second scheme without approval.

### Minimum necessary fields

Allowed:

- `requestId`
- `uid` (operational join only)
- `status` (`queued` \| `in_progress` \| `completed` \| `failed`)
- `requestedAt` (correlation string or null)
- Server timestamps: `startedAt`, `completedAt`, `updatedAt`
- Sanitized `error` code enum/string **without** paths, tokens, emails, or health payloads
- Optional coarse progress marker(s) needed for idempotent resume (e.g. boolean/stage enum) — **not** raw Storage path arrays or file inventories in the retained completed record

Forbidden in the retained ledger:

- Email / phone / display name
- Health payloads (RawEvents, facts, labs, journals, etc.)
- Integration refresh tokens or secrets
- ID / refresh tokens
- Export ZIP contents or signed URLs
- Unbounded raw exception stacks
- IP / device fingerprints unless a later RFC proves necessity
- Consumer-app readable product data

**Completed records must not retain `storageDelete` path inventories.** Path-bearing debug belongs in ephemeral logs with redaction policy, not durable ledger fields.

### Retention / TTL

| Item | Decision |
|------|----------|
| **Retention purpose** | Crash/retry recovery + sanitized operational outcome for a bounded window |
| **Default retention** | **90 days** from `completedAt` (or from `updatedAt` if failed and never completed) |
| **Enforcement** | Ledger documents carry `expireAt` + `retentionDays`. Firestore TTL on `expireAt` and a daily scheduled sweep (`onAccountDeletionLedgerExpireSweep`) purge expired docs. Legacy `storageDelete` inventories are stripped on write and by disposition/sweep. |
| **Indefinite retention** | **Forbidden** merely because the record is labeled “audit” |
| **Legal hold** | If counsel later requires longer retention, a separate RFC updates TTL; RG-LEGAL-01 does not by itself authorize indefinite keep |
| **Export policy** | Excluded from consumer export packages |
| **Deletion policy** | Eligible for TTL/scheduled purge after retention window; not deleted as part of the user subtree (it outlives the user) |
| **Analytics** | Excluded from product analytics |

### Access controls

| Actor | Access |
|-------|--------|
| Consumer app / client SDK | **None** (no Firestore client access) |
| Cloud Run API | Read for status fallback only when user mirror missing **and** Auth still valid; never expose forbidden fields |
| Deletion Function / Admin runtime | Read/write for lifecycle processing |
| Humans | Staging/production console access only via existing admin controls; no casual export of ledger contents into tickets |

### Retry / recovery role

- Every worker invocation is idempotent.
- Missing resources treated as already deleted where safe.
- Resume from durable ledger status/stage, not from client state.
- Failed Auth deletion is retryable without consumer credentials.
- Completion is recorded on the ledger **after** Auth deletion succeeds.

### Status after Auth deletion

After Firebase Auth is removed:

- Consumer cannot authenticate; normal API access ends.
- User-scoped mirror is already gone.
- **Completion truth** lives on the durable ledger (`status: completed`).
- Worker retries use Admin credentials + ledger state only.
- Sanitized admin probes may confirm completion without printing identifiers to chat/logs shared outside admin tooling.

---

## 3. Server-enforced recent authentication

Client reauthentication UI is necessary but **not sufficient**.

| Item | Decision |
|------|----------|
| **Bound** | Firebase ID token `auth_time` must be within **5 minutes** of server `now` for `POST /account/delete` |
| **Source of truth** | Verified token claims after `verifyIdToken` — never a client boolean, never a client timestamp, never the password |
| **Password** | Never sent to Cloud Run / Functions |
| **Missing `auth_time`** | Reject |
| **Stale token** | Reject with typed safe error requiring reauthentication (e.g. `REAUTH_REQUIRED`) |
| **GET status routes** | Do **not** require the 5-minute window (ordinary valid Auth is enough) while Auth remains |
| **Logging** | Do not log raw tokens, email, or `auth_time` paired with UID in consumer-facing or casually shared logs |

Mobile sequence:

1. Reauthenticate with Firebase Auth on device
2. Force-refresh ID token
3. `POST /account/delete` with that token + `x-request-id`
4. Clear password from memory/UI immediately

---

## 4. Deletion-pending server gate

Once a deletion request is accepted (`queued` / `in_progress`), the account must not continue normal product use via a modified or old client.

| Item | Decision |
|------|----------|
| **Gate source** | Server checks durable ledger and/or user mirror for active pending deletion before normal authenticated product routes |
| **Blocked** | Normal product writes; normal sensitive health reads that mutate or expose account health state |
| **Allowed while Auth valid** | `GET /delete/latest`, `GET /delete/{requestId}`, idempotent `POST /account/delete` (returns existing), and other narrowly allowlisted account-control endpoints required for pending UX |
| **Idempotency** | Retried delete remains safe |
| **Recreation** | User cannot recreate normal profile/health data during pending deletion |
| **Auth removal** | Only after lifecycle deletion succeeds (Auth last) |

UI hiding screens is **not** the control plane.

---

## 5. Deletion order

1. Accept request (mirror + ledger `queued`) + publish
2. Worker: ledger `in_progress`
3. Integration credential revocation / connection tombstones
4. Export artifacts (Storage + global export docs)
5. App Storage prefixes
6. Firestore user subtree (including request mirror)
7. Firebase Auth user **last**
8. Ledger `completed` (no forbidden fields)

Do not mark complete before Auth deletion succeeds.

Unresolved BLOCKED lifecycle stores block ship (registry must remain honest).

---

## 6. Local lifecycle (mobile)

Central coordinator clears device stores on sign-out, account switch, and account deletion per `localDataStoreRegistry` + repository-wide persistence search.

Requirements:

- Cleanup completes before Account B authenticated UI loads
- No Account A flash / queue submit as B
- Export ZIP cleanup
- Recovery marker: phase only — **no** password, token, email, health payload, request id required in marker
- Cleanup failure blocks authenticated UI safely

---

## 7. API surface

| Method | Path | Notes |
|--------|------|-------|
| POST | `/account/delete` | Recent-auth required; idempotent |
| GET | `/delete/latest` | Auth required; no recent-auth window |
| GET | `/delete/{requestId}` | Auth required; user-scoped; no recent-auth window |

API Gateway must expose **all three** paths (parity with export status routes).

---

## 8. Crash windows (required properties)

| Window | Required behavior |
|--------|-------------------|
| Before worker starts | Mirror + ledger `queued`; republish/idempotent accept safe |
| During integrations | Retry; missing secrets OK |
| During export cleanup | Retry; missing objects OK |
| During Storage delete | Retry; partial failure → failed + retry |
| During Firestore subtree | Retry; recursive delete idempotent |
| After subtree, before Auth | Ledger remains; Auth delete retryable |
| Auth delete failure | Retryable; not completed |
| After Auth, before ledger complete | Retry marks completed idempotently |
| Ledger write failure after Auth | Retry completion write; Auth already gone is OK |

Consumer status never exposes internal steps. No health payload in logs.

---

## 9. Open dependencies

- **RG-LEGAL-01** remains OPEN
- Export coverage closure remains OPEN (honest gaps allowed)
- Export scalability gate remains OPEN
- No production IAM / production deploy in Stage 1C

---

## Implementation note (branch truth)

After ADR acceptance (2026-08-30), Stage 1C must conform to this RFC before staging deploy, including:

- Server `auth_time` recent-auth enforcement on `POST /account/delete`
- Deletion-pending API gate for normal product routes
- Durable ledger creation at accept time (before publish / before destructive work)
- Minimized retained ledger fields (no path inventories on completed records)
- Gateway OpenAPI entries for `GET /delete/latest` and `GET /delete/{requestId}`

Do not deploy staging until conforming code lands on the PR head and physical-iPhone verification is prepared.
