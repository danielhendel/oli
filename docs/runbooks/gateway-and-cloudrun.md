# Gateway + Cloud Run Runbook

Defines operational procedures for:

- Deployment
- Revision verification
- Gateway drift
- 401 vs 403 diagnosis
- Route mismatch debugging

Environment:
- Project: oli-staging-fdbba
- Region: us-central1
- Service: oli-api
- Gateway: oli-gateway-cw04f997.uc.gateway.dev

---

## 1. Build + Deploy

### 1.1 Build image
```bash
scripts/deploy/phase3a-withings-build-api-image.sh
1.2 Deploy Cloud Run
scripts/deploy/phase3a-withings-deploy-cloudrun.sh <commit_short_sha>
1.3 Deploy Gateway
scripts/deploy/phase3a-withings-deploy-gateway.sh
2. Confirm Active Revision
gcloud run services describe oli-api \
  --region us-central1 \
  --format="value(status.traffic[0].revisionName,status.url)"
3. Confirm Gateway Config
gcloud api-gateway gateways describe oli-gateway \
  --location us-central1 \
  --project oli-staging-fdbba \
  --format="yaml(apiConfig,defaultHostname,state)"
4. 401 vs 403 Diagnosis
401 from Gateway

Cause:

Missing JWT

Invalid JWT

Missing API key

Check:

Authorization header present

?key=API_KEY present

403 from Cloud Run

Cause:

Direct run.app call without invoker identity

Invoker route accessed via gateway

Expected:

/integrations/withings/pull → invoker-only (NOT exposed in OpenAPI)

pull-now → gateway route

5. Route Drift Detection

If Gateway returns:

404 The current request is not defined by this API.

It means:

Route missing from openapi.yaml

Gateway not redeployed

Wrong hostname used

6. Confirm PUBLIC_BASE_URL
gcloud run services describe oli-api \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"

Must include:

PUBLIC_BASE_URL=https://oli-gateway-cw04f997.uc.gateway.dev

WITHINGS_REDIRECT_URI matching callback

7. Common Failure Matrix
Symptom	Likely Cause
401 Jwt missing	missing Authorization header
403 run.app	wrong redirect host
400 INVALID_QUERY	strict schema mismatch
404 route not defined	OpenAPI drift
502 pull-now	Withings API issue