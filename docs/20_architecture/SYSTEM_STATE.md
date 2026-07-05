# System State — As Built

This document describes the **actual system architecture**, not the aspirational one.

---

## High-Level Architecture

[ Expo App ]
|
| Firebase ID Token
v
[ API Service (Express) ]
|
| Firestore writes
v
[ Firestore ]
|
| Triggers
v
[ Functions Pipeline ]

yaml
Copy code

---

## Mobile App

**Stack**
- Expo
- Expo Router
- Firebase JS SDK

**Responsibilities**
- Authenticate user
- Maintain auth state
- Generate Firebase ID token
- Send authenticated requests to API

---

## API Service

**Location**
services/api

markdown
Copy code

**Runtime**
- Node.js
- Express
- Firebase Admin SDK

**Key Behaviors**
- Initializes Firebase Admin via ADC
- Verifies Firebase ID tokens
- Enforces user-scoped access
- Accepts canonical ingest payloads
- Guarantees idempotent writes

---

## Firestore Data Model (Current)

users/{uid}/rawEvents/{rawEventId}

yaml
Copy code

Each raw event contains:
- id
- userId
- provider
- kind
- payload
- occurredAt
- receivedAt

---

## Functions Pipeline

Already implemented and tested:
- Raw event normalization
- Daily aggregation
- Intelligence computation

Not yet wired to UI.

---

## Today Command Center (Dash)

**As built (2026-07):**
- `TodayCommandModel` in `lib/today/` — shared view model for Dash, Timeline plan-vs-actual, and Program target summaries
- Dash **Today Command Center** — non-card hero under greeting: semi-circle completion, readiness summary, daily target rows
- Timeline today view uses the same model for plan vs actual header
- Program tab shows category cards (Weight, Activity, Workout, Cardio, Nutrition) fed by preferences + typed defaults
- Oura sleep/readiness scores displayed exactly as received; labeled Oura when vendor-sourced

**Known limitations:**
- Nutrition target persistence pending (defaults via `lib/data/nutrition/nutritionGoals.ts`)
- Program document persistence pending (`users/{uid}/programs/*` not wired)
- Daily workout schedule model pending (workout row uses weekly preference, excluded from completion %)
- Cardio daily target derived from weekly miles / 7
- Weight target persistence pending (links to body settings)

---

## Environments

- Local dev: Application Default Credentials
- Cloud Run: GCP service account
- Firebase project alignment is mandatory

---

This architecture is intentionally simple and extensible.