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
- [ ] Repo consolidated to `~/oli` (no stray code)
- [ ] Root docs folder exists (`/docs`)
- [ ] Node version pinned (e.g., `.nvmrc`)
- [ ] Editor/formatting baseline present (`.editorconfig`)
- [ ] README updated with local + prod run instructions

## 2) Local API (Phase 1.1)
- [ ] `cd services/api && npm ci && npm run dev` starts server locally
- [ ] `GET http://localhost:PORT/` returns JSON `{ ok: true, service: "api" }`
- [ ] `GET http://localhost:PORT/api/healthz` returns JSON `{ status: "healthy" }`

## 3) Containerization & Cloud Run (Phase 1.2)
- [ ] Docker image builds locally (multi-stage)
- [ ] Cloud Run service deployed
- [ ] Health endpoints live in prod:
  - [ ] `GET $CLOUD_RUN_URL/`
  - [ ] `GET $CLOUD_RUN_URL/api/healthz`

## 4) CI/CD Workflow (Phase 1.3)
- [ ] GitHub Actions health probe workflow exists
- [ ] Probes both `/` and `/api/healthz`
- [ ] Latest run is green on `main`

## 5) Observability & Logs
- [ ] Cloud Run logs show successful requests for both health endpoints
- [ ] Error budget: zero errors on health probes post-deploy

## 6) Outcomes (Sign-off)
- [ ] Phase 0 complete (foundation, repo hygiene)
- [ ] Phase 1 complete (API live, CI green)
- [ ] Ready for Phase 2: Full API + Firebase integration

### Notes
- Cloud Run Service: (paste URL)
- Region:
- Artifact Registry image:
- GitHub Actions workflow file:
- Date & tag of completion:
