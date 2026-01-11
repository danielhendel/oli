Local Development Guide (Staging-Only)

This document defines the only supported local development workflow for Oli Health OS v1.

This repo intentionally enforces production-grade discipline from day one.

❌ Explicitly Unsupported

Firebase emulators

Local databases

Local authentication

Local HTTP APIs

Hybrid local/staging modes

Legacy development flows

All development runs against staging Firebase + staging Cloud Run.

✅ What Is Supported

Expo mobile app (local runtime)

Staging Firebase (Auth, Firestore, Storage)

Staging Cloud Run API

Real authentication + real data paths

Strict environment enforcement

Prerequisites

Node.js 18+

npm

Expo CLI

Google Cloud SDK

Staging Firebase project

Staging Cloud Run API deployed and reachable over HTTPS

1. Authenticate With Google Cloud

Authenticate once per machine:

gcloud auth login
gcloud auth application-default login
gcloud config set project <staging-project-id>
gcloud auth application-default set-quota-project <staging-project-id>


Verify:

gcloud config get-value project

2. Configure Environment Variables (Mobile)

Create or update your local Expo environment file:

.env.local


Required values:

EXPO_PUBLIC_BACKEND_BASE_URL=https://<your-staging-cloudrun-api>

EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

⚠️ Do NOT include

Any local dev host

Any emulator configuration

Any non-HTTPS backend URL

.env.local is intentionally ignored by git.

3. Start the Mobile App

From the repo root:

npx expo start -c


Open in the iOS Simulator.

The app connects directly to:

Staging Firebase

Staging Cloud Run API

No local backend processes are required.

4. Sign In

Create a user directly in the app UI

Firebase Auth is the sole identity authority

No manual Firebase Console steps are required

5. Generate a Firebase ID Token

In the app:

Debug → Token


Generate an ID token

Copy it to the clipboard

6. Test Event Ingest (Staging)

Paste the token from the simulator clipboard:

TOKEN="$(xcrun simctl pbpaste booted | tr -d '\n' | tr -d '\r')"


Send a test event:

curl -i \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: smoke-steps-1" \
  --data-raw '{
    "provider": "manual",
    "kind": "steps",
    "occurredAt": "2025-12-20T00:00:00Z",
    "payload": { "steps": 1234 }
  }' \
  https://<your-staging-cloudrun-api>/ingest/events

Expected Response
HTTP/1.1 202 Accepted


If this fails, do not proceed.

Enforcement Guarantees

The backend refuses to start if any emulator-related environment variables are present.

Startup will fail if any emulator host variables are detected.

This guarantees:

No accidental local writes

No environment drift

Production-safe habits from day one

Clean auditability

Troubleshooting
❌ 401 / 403 Unauthorized

Token expired

User not authenticated

Wrong Firebase project

❌ Network Error

Incorrect Cloud Run URL

Service not deployed

Missing HTTPS

❌ App Won’t Boot
npx expo start -c


Ensure .env.local values are correct.

Non-Goals (Intentionally Deferred)

The following are explicitly out of scope for v1:

Firebase emulators

Local Firestore

Local Auth

Local HTTP APIs

Multi-environment dev modes

These are deferred until post-MVP team scale.

✅ Status

This document is authoritative.

If a workflow is not described here, it is not supported.