# Local Development Guide

This is the **exact sequence** that works.

No steps omitted.

---

## Prerequisites

- Node.js 18+
- npm
- Expo CLI
- Google Cloud SDK
- Firebase project created

---

## 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <firebase-project-id>
gcloud auth application-default set-quota-project <firebase-project-id>
2. Start API Service
bash
Copy code
cd services/api
lsof -ti :8080 | xargs kill -9 || true

GOOGLE_CLOUD_PROJECT=<project-id> \
GCLOUD_PROJECT=<project-id> \
PORT=8080 \
npm run dev
Expected output:

csharp
Copy code
[api] firebase-admin initialized projectId=<project-id>
API listening on port 8080
3. Start Mobile App
bash
Copy code
cd ../../
npx expo start -c
Open in iOS simulator.

4. Sign In
Create user in Firebase Auth console (email/password)

Sign in via app

5. Generate Token
Navigate to Debug → Token

Generate token

Copy token

6. Test Ingest
bash
Copy code
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
  http://localhost:8080/ingest/events
Expected:

Copy code
202 Accepted
If any step fails, do not continue.

yaml
Copy code

---

# 📄 `docs/SECURITY_MODEL.md`

```md
# Security Model

This system uses **Firebase Auth as the sole identity authority**.

---

## Identity

- Users authenticate via Firebase Auth
- Mobile app receives Firebase ID token
- Token is sent to backend via Authorization header

---

## API Authentication

```http
Authorization: Bearer <firebase-id-token>
Backend:

Verifies token using firebase-admin

Extracts uid

Rejects invalid or expired tokens

Authorization
All data is user-scoped

Firestore writes occur under /users/{uid}

No cross-user access is possible

Idempotency
Client may send Idempotency-Key header

API uses key as Firestore document ID

Duplicate requests return 202 Accepted

Trust Boundaries
Layer	Trust
Mobile App	Untrusted
API	Trusted
Firestore	Trusted
Functions	Trusted

