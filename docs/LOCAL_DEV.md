Local Development Guide (Staging-Only)

This guide describes the only supported local workflow.

❌ No Firebase emulators

❌ No localhost APIs

❌ No legacy flows

All development runs against staging Cloud Run services.

Prerequisites

Node.js 18+

npm

Expo CLI

Google Cloud SDK

Firebase project (staging)

Cloud Run API deployed (staging)

1. Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login
gcloud config set project <staging-project-id>
gcloud auth application-default set-quota-project <staging-project-id>


Verify:

gcloud config get-value project

2. Configure Environment Variables (Mobile)

Create or update your local Expo env file:

.env.local

EXPO_PUBLIC_BACKEND_BASE_URL=https://<your-staging-cloudrun-api>

EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...


⚠️ Do not include:

localhost

emulator hosts

.env.local in git (already ignored)

3. Start Mobile App

From repo root:

npx expo start -c


Open in iOS Simulator

App connects directly to staging Firebase + Cloud Run

4. Sign In

Create a user using the app UI

Firebase Auth is the sole identity authority

No manual Firebase Console steps required

5. Generate ID Token

In the app:

Debug → Token


Generate Firebase ID token

Copy token to clipboard

6. Test Event Ingest (Staging)
TOKEN="$(xcrun simctl pbpaste booted | tr -d '\n' | tr -d '\r')"

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

The backend will refuse to start if any emulator variables are present:

FIRESTORE_EMULATOR_HOST

FIREBASE_AUTH_EMULATOR_HOST

This ensures:

No accidental local writes

No environment drift

Production-safe habits from day one

Troubleshooting
❌ 401 / 403

Token expired

User not authenticated

Wrong Firebase project

❌ Network Error

Incorrect Cloud Run URL

Service not deployed

Missing HTTPS

❌ App won’t boot
npx expo start -c

Non-Goals (Intentionally Unsupported)

Firebase emulators

Local Firestore

Local Auth

localhost APIs

Hybrid dev/prod modes

These are deferred until post-MVP team scale.
