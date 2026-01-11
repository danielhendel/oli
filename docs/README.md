# Oli Health OS — Repo Truth (Read First)

This repository contains the **actual, working implementation** of the Oli Health OS as of today.

This document is the **single entry point** for understanding:
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
- `docs/LOCAL_DEV.md`
- `docs/SYSTEM_STATE.md`

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
