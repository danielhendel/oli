# API Gateway (Google Cloud)

The mobile app’s `EXPO_PUBLIC_BACKEND_BASE_URL` should point at the **managed gateway** host (e.g. `https://oli-gateway-….uc.gateway.dev`), not Cloud Run directly. The gateway configuration is the OpenAPI spec in this directory.

## When to redeploy

Redeploy whenever `openapi.yaml` changes (new paths, security, or backends). If a route works against **Cloud Run** but returns **404** from the gateway while other routes (e.g. `GET /users/me/daily-facts`) return **401** with a bad token, the **active gateway config is missing that path** — create a new API config and update the gateway.

## Deploy (staging)

From the **oli** repo root, with `gcloud` project `oli-staging-fdbba` and the existing gateway `oli-gateway` in `us-central1`:

```bash
bash scripts/deploy/phase3a-withings-deploy-gateway.sh
```

This runs `gcloud api-gateway api-configs create` from `infra/gateway/openapi.yaml`, then `gcloud api-gateway gateways update` to roll forward.

After deploy, probe (expect **401** without a valid Firebase token, not **404**):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://oli-gateway-cw04f997.uc.gateway.dev/users/me/nutrition/food-search?q=chicken" \
  -H "Authorization: Bearer invalid"
```

Expected: **401** (route registered). **404** means the new config is not live yet.

## Nutrition food reads (Nutritionix)

Food search and barcode lookups are implemented on **Cloud Run** (`GET /users/me/nutrition/*`). Configure Nutritionix **only** as Cloud Run secrets/env vars (`NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY`, optional `NUTRITIONIX_REMOTE_USER_ID`, `NUTRITION_FOOD_PROVIDER`). Do **not** add Nutritionix credentials to Expo `EXPO_PUBLIC_*` vars or the mobile bundle.
