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

## Dash home (Oli Fitness)

**As built (2026-07-10 recovery baseline):**
- Dash tab (`app/(app)/(tabs)/dash.tsx`) composes six retained cards after `DashScreenHeader`: Weekly Fitness → Body Composition → Daily Energy → Daily Sleep → Oura Readiness → Daily Nutrition
- Semi-circle / composite daily % / “Today’s Progress” card removed from Dash (no replacement hero)
- `TodayCommandModel` in `lib/today/` remains for Timeline plan-vs-actual (and shared target helpers); not rendered on Dash
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