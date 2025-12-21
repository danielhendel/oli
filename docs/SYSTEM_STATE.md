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

## Environments

- Local dev: Application Default Credentials
- Cloud Run: GCP service account
- Firebase project alignment is mandatory

---

This architecture is intentionally simple and extensible.