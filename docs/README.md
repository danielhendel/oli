# Oli Health OS — Repo Truth (Read First)

> **STALE / HISTORICAL OVERVIEW (updated December 2025).**
> Do **not** use this file as current execution truth.
> **Start here instead:** [docs/INDEX.md](./INDEX.md) → [Repo-Truth Progress Map](./00_truth/REPO_TRUTH_PROGRESS_MAP.md) → [ROADMAP_REALITY](./10_product/roadmap/ROADMAP_REALITY.md) → [SYSTEM_STATE](./20_architecture/SYSTEM_STATE.md).
> Claims below such as “wearables missing” or “no data visualization” are obsolete relative to merged code as of 2026-08-10.

Canonical entry point: docs/INDEX.md

This repository contains the **actual, working implementation** of the Oli Health OS as of today.

This document is a Repo Reality Overview. For understanding:
- What is live and functional
- How the system works end-to-end
- How to run everything locally without guesswork

If something is not documented here, it should be assumed **not production-ready**.

---

## What Works Today ✅

### Mobile App (Expo / React Native)
- Firebase client initialized from environment variables
- Email + password authentication
- Auth state provider
- Debug token screen for extracting Firebase ID tokens
- Module entry screens (Settings, Nutrition, Workouts, etc.)

### API Service (Cloud Run compatible)
- Express API with health check
- Firebase Admin SDK initialized via Application Default Credentials
- Firebase Auth token verification
- Canonical event ingestion endpoint:
  - `POST /ingest/events`
  - User-scoped
  - Strong idempotency
- Raw events written to Firestore under user namespace

### Backend Pipeline (Functions)
- Firestore triggers already exist for:
  - Raw event ingestion
  - Normalization
  - Daily facts
  - Intelligence computation
- Tests for normalization and intelligence all pass

---

## What Does NOT Exist Yet 🚫

- Public user onboarding
- OAuth (Google / Apple)
- Data visualization
- AI insights surfaced in app
- Schema versioning beyond v1
- External integrations (wearables, labs)

---

## How to Start Locally (Happy Path)

See:
- `docs/40_engineering/local-dev/LOCAL_DEV.md`
- `docs/20_architecture/SYSTEM_STATE.md`

---

## Non-Goals of This Repo (For Now)

- Marketing site
- Investor materials
- Speculative architecture
- Over-engineered abstractions

This repo prioritizes **correctness, ownership, and forward compatibility**.

---

**Authoritative status date:** December 2025
**Owner:** Daniel Hendel
