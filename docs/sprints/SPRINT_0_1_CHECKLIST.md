# Sprint 0–1: Foundation + Health API Deployment — Completion Checklist

Project: Oli Health OS  
Repo: `~/oli`  
Infra: Firebase + GCP (Cloud Run, Artifact Registry)  
Frontend: React Native  
Backend: Node.js/TypeScript (`services/api`)

> Source of truth: “📑 Oli Sprint 0–1: Foundation + Health API Deployment”
> Deliverables: Working health service in prod, CI probes green, structure consolidated.

---

## 1) Repo & Infra Foundation
- [x] Repo consolidated to `~/oli` (no stray code)
- [x] Root docs folder exists (`/docs`)
- [x] Node version pinned (e.g., `.nvmrc`)
- [x] Editor/formatting baseline present (`.editorconfig`)
- [x] README updated with local + prod run instructions

## 2) Local API (Phase 1.1)
- [x] `cd services/api && npm ci && npm run dev` starts server locally
- [x] `GET http://localhost:PORT/` returns JSON `{ ok: true, service: "api" }`
- [x] `GET http://localhost:PORT/api/healthz` returns JSON `{ status: "healthy" }`

## 3) Containerization & Cloud Run (Phase 1.2)
- [x] Docker image builds locally (multi-stage)
- [x] Cloud Run service deployed
- [x] Health endpoints live in prod:
  - [x] `GET $CLOUD_RUN_URL/`
  - [x] `GET $CLOUD_RUN_URL/api/healthz`

## 4) CI/CD Workflow (Phase 1.3)
- [x] GitHub Actions health probe workflow exists
- [x] Probes both `/` and `/api/healthz`
- [x] Latest run is green on `main`

## 5) Observability & Logs
- [x] Cloud Run logs show successful requests for both health endpoints
- [x] Error budget: zero errors on health probes post-deploy

## 6) Outcomes (Sign-off)
- [x] Phase 0 complete (foundation, repo hygiene)
- [x] Phase 1 complete (API live, CI green)
- [x] Ready for Phase 2: Full API + Firebase integration

### Notes
- Cloud Run Service: https://healthos-api-zervimbdzq-uc.a.run.app
- Region: us-central1
- Artifact Registry image:
- GitHub Actions workflow file:
- Date & tag of completion: 2025-09-28 21:56:59Z;
