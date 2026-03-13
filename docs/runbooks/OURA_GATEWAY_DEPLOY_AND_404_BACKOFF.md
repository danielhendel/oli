# Oura Gateway Deploy + 404 Backoff

**Purpose:** Exact procedure to deploy updated API Gateway config (Oura paths) and why repeated 404s occurred despite backoff.

---

## 1. Gateway deployment procedure (repo truth)

**Authoritative sources:**
- `scripts/deploy/phase3a-withings-deploy-gateway.sh` — script that creates config and updates gateway
- `docs/runbooks/gateway-and-cloudrun.md` — runbook (Deploy Gateway = run the script)
- `docs/phase3a/RUNBOOK_WITHINGS_PHASE3A_CLOSEOUT.md` — inline gcloud commands and verification

**OpenAPI spec:** `infra/gateway/openapi.yaml` (must include Oura paths for gateway to forward them).

---

## 2. Exact commands to deploy updated gateway config for Oura

**Prerequisites:**
- `gcloud` CLI installed and authenticated
- Current gcloud project = `oli-staging-fdbba` (script enforces this)
- Gateway `oli-gateway` exists in `us-central1` (script preflight checks this)
- Repo root contains updated `infra/gateway/openapi.yaml` (with Oura paths committed)

**Option A — Use the script (recommended):**

```bash
# From repo root
cd /path/to/oli
gcloud config set project oli-staging-fdbba
./scripts/deploy/phase3a-withings-deploy-gateway.sh
```

**Option B — Inline gcloud (if you need to run manually):**

```bash
# From repo root. Ensure project.
gcloud config set project oli-staging-fdbba

# Create new API config from current openapi.yaml (unique name)
CONFIG_ID="oli-api-config-$(date +%Y%m%d-%H%M%S)"
gcloud api-gateway api-configs create "$CONFIG_ID" \
  --api=oli-api \
  --project=oli-staging-fdbba \
  --openapi-spec=infra/gateway/openapi.yaml

# Update gateway to use the new config (location = us-central1)
gcloud api-gateway gateways update oli-gateway \
  --api-config=projects/1010034434203/locations/global/apis/oli-api/configs/$CONFIG_ID \
  --location=us-central1 \
  --project=oli-staging-fdbba
```

**Note:** Cloud Run does **not** need to be redeployed to expose Oura routes. Only the API Gateway config must be updated so the gateway forwards the new paths to the existing backend.

---

## 3. Prerequisites (checklist)

| Requirement | How to verify |
|-------------|----------------|
| gcloud project | `gcloud config get-value project` → `oli-staging-fdbba` |
| Gateway exists | `gcloud api-gateway gateways describe oli-gateway --location=us-central1 --project=oli-staging-fdbba` (no error) |
| OpenAPI has Oura paths | `grep -E "oura/status|oura/connect" infra/gateway/openapi.yaml` (should list those paths) |

---

## 4. How to verify success

**A. Gateway is using the new config**

```bash
gcloud api-gateway gateways describe oli-gateway \
  --location=us-central1 \
  --project=oli-staging-fdbba \
  --format="yaml(apiConfig)"
```

`apiConfig` should point to the config you just created (e.g. `.../configs/oli-api-config-YYYYMMDD-HHMMSS`).

**B. Oura status returns 401 (route exists; auth required), not 404**

Without a token the gateway should return 401, not 404:

```bash
curl -sS -o /dev/null -w "%{http_code}" "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/oura/status?key=YOUR_GATEWAY_API_KEY"
# Expected: 401 (Jwt is missing). If 404 → gateway config not yet active or path missing from spec.
```

With a valid Firebase ID token:

```bash
curl -sS -i -H "Authorization: Bearer $TOKEN" "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/oura/status?key=YOUR_GATEWAY_API_KEY"
# Expected: 200 and JSON body with ok, connected, lastSyncAt.
```

---

## 5. Why repeated Oura 404s occurred despite backoff

**Repo truth:**

- `useOuraPresence()` is used in **four** places:
  - `app/(app)/settings/devices.tsx`
  - `app/(app)/settings/devices/[deviceId].tsx`
  - `app/(app)/settings/data-sources/index.tsx`
  - `app/(app)/settings/data-sources/source/[sourceId].tsx`

- Each usage is a **separate hook instance** with its **own** `useRef` state. The previous backoff used a **per-instance** ref (`last404At`). So:
  - **Devices screen:** one instance; after first 404 it set `last404At` and skipped refetch for 5 min on that screen.
  - **Data Sources screen:** a **different** instance; its `last404At` was always `null`, so every mount/focus triggered a new request → 404.
  - **Oura device detail:** yet another instance → another 404.
  - Navigating Devices → Data Sources → Devices created new instances (or new refs), so the backoff was **not shared** and did not stop cross-screen spam.

---

## 6. Backoff fix: shared storage

**Change:** Backoff is now stored in **AsyncStorage** (shared by all hook instances):

- **Keys:** `lib/integrations/oura/storage.ts` — `OURA_STATUS_404_BACKOFF_UNTIL`, `getOuraStatus404BackoffUntil()`, `setOuraStatus404BackoffUntil(untilMs)`.
- **Behavior in** `lib/data/useOuraPresence.ts`:
  - Before calling `getOuraStatus`, the hook reads `getOuraStatus404BackoffUntil()`. If the value is a future timestamp, it skips the request and sets state to ready / not connected.
  - On **404**, it calls `setOuraStatus404BackoffUntil(Date.now() + 5min)` so **all** instances respect the same 5‑minute backoff.
  - On **success**, it calls `setOuraStatus404BackoffUntil(0)` so the next 404 can start a fresh backoff.

**Result:** Any screen (Devices, Data Sources, Oura detail) that mounts or refetches will see the same backoff; only one 404 is needed to pause status calls app-wide for 5 minutes.

---

## 7. Files changed (this audit + fix)

| File | Change |
|------|--------|
| `lib/integrations/oura/storage.ts` | Added `OURA_STATUS_404_BACKOFF_UNTIL`, `getOuraStatus404BackoffUntil()`, `setOuraStatus404BackoffUntil()`. |
| `lib/data/useOuraPresence.ts` | Backoff now uses shared AsyncStorage; removed per-instance `last404At` ref; on 404 set shared backoff; on success clear backoff. |
| `docs/runbooks/OURA_GATEWAY_DEPLOY_AND_404_BACKOFF.md` | This runbook. |

---

## 8. Summary

- **Deploy Oura gateway:** Run `./scripts/deploy/phase3a-withings-deploy-gateway.sh` from repo root (project `oli-staging-fdbba`, openapi.yaml with Oura paths). No Cloud Run redeploy needed.
- **Verify:** Gateway `apiConfig` updated; `GET /integrations/oura/status` returns 401 without JWT and 200 with valid Bearer token.
- **404 backoff:** Now app-wide via AsyncStorage; one 404 stops all Oura status requests for 5 minutes across every screen that uses `useOuraPresence`.
