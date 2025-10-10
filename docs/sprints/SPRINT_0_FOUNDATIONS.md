# Sprint 0 — Project Setup, Environments, CI/CD

## ✅ Technical Completion Report

### 1. Repository & Environments
- GitHub repo **danielhendel/oli** initialized.
- Branch protection enabled for `main`:
  - ✅ Require Pull Request before merging.
  - ✅ Require CI checks to pass before merging.
  - ✅ Require branches to be up to date.

### 2. Cloud Infrastructure (Backend Foundations)
- **GCP Project:** `oli-backend`.
- **Cloud Run Service:** `healthos-api` (Node 20 + Express).
  - Deployed with CI/CD in `us-central1`.
  - Public URL: `https://healthos-api-<id>-uc.a.run.app`.
- **Artifact Registry:** stores amd64 Docker images.
- **Firestore (Native mode, us-central1):**
  - Database online.
  - Service account **`healthos-api@oli-backend.iam.gserviceaccount.com`** granted IAM:
    - `roles/datastore.user`
    - `roles/datastore.viewer`
  - Validated via `/api/firebase/healthz`.
- **Pub/Sub & Secret Manager:** enabled for future use.

### 3. API Service Endpoints
- Health checks:
  - `/` → `{ ok: true, service: "api", uptime, timestamp }`
  - `/healthz`
  - `/api/healthz`
- Firebase health check:
  - `/api/firebase/healthz` → confirms Firestore read/write.

### 4. CI/CD Pipelines
- **CI Workflow (`ci.yml`):**
  - Runs on PRs + pushes to `main`.
  - Jobs: typecheck, lint, test.
  - Probes production API (`/api/firebase/healthz`) with jq.
  - Must be ✅ green to merge.
- **Infra Workflow (`infra-ci.yml`):**
  - Runs Terraform validation (`terraform init -backend=false && terraform validate`) on `infra/`.

### 5. Versioning & Milestones
- Milestone **tag `v0.2.0`** created after Firestore probe was live in CI.
- Documentation committed in `docs/sprints/`.

---

## 🧑‍🤝‍🧑 Layman’s Explanation

Sprint 0 was all about building the **foundation** so everything that comes later is safe, stable, and professional:

- We set up the **repo** and rules so only tested, safe code goes into main.
- We deployed the **backend service** (our API “brain”) into Google Cloud.
- We wired up a **database** (Firestore) and confirmed it works with the backend.
- We added **health checks** so we can always see if the system is alive.
- We built an **automated test pipeline** that:
  - Checks code quality.
  - Runs tests.
  - Confirms the live database is reachable.
- We locked down **main branch protection** so bad code can never merge.
- We tagged a milestone (`v0.2.0`) marking the foundation complete.

In short: Sprint 0 gave us a **world-class foundation**. Everything is wired up, tested, and locked down so we can now start building real user-facing features.

---
