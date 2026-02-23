# Withings Integration Runbook

This document defines the operational procedures for:

- OAuth connect / callback
- pull-now (user initiated)
- scheduled pull (invoker)
- backfill
- invalid refresh token remediation
- registry consistency
- log correlation via requestId

Environment:
- Project: `oli-staging-fdbba`
- Region: `us-central1`
- Service: `oli-api`
- Gateway: `oli-gateway-cw04f997.uc.gateway.dev`

---

## 1. Quick Health Check

### 1.1 Check Cloud Run revision
```bash
gcloud run services describe oli-api \
  --region us-central1 \
  --format="value(status.traffic[0].revisionName,status.url)"
1.2 Check Gateway config
gcloud api-gateway gateways describe oli-gateway \
  --location us-central1 \
  --project oli-staging-fdbba \
  --format="yaml(apiConfig,defaultHostname,state)"
2. Withings Status (User)
curl -sS \
  -H "Authorization: Bearer <ID_TOKEN>" \
  "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/status?key=$GATEWAY_API_KEY"

Expected fields:

connected: true

failureState: null

backfill.status: running | complete

lastSyncAt present after pull-now

3. Pull-Now (User)
Required headers:

Authorization header: Bearer token

Idempotency-Key

curl -sS -X POST \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Idempotency-Key: debug_pull_now_$(date +%s)" \
  "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/pull-now?key=$GATEWAY_API_KEY"

Expected success:

{
  "ok": true,
  "windowHours": 72,
  "eventsCreated": <number>,
  "eventsAlreadyExists": <number>
}
4. Correlate by requestId

If pull-now returns an error:

gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.rid="<REQUEST_ID>"' \
  --limit=200 \
  --format="value(timestamp,jsonPayload.level,jsonPayload.msg,jsonPayload.code,jsonPayload.err)"

Common messages:

withings_pull_now_fetch_failed

WITHINGS_TOKEN_REFRESH_FAILED

WITHINGS_MEASURE_API_ERROR

5. Invalid Refresh Token Flow

When Withings returns:

Invalid Params: invalid refresh token

Expected system behavior:

Secret destroyed

Registry doc deleted

integration.connected → false

integration.failureState set to:

code: WITHINGS_REFRESH_TOKEN_INVALID

message: "Withings connection expired. Please reconnect."

Verify registry:

node <<'NODE'
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'oli-staging-fdbba' });
const db = admin.firestore();
(async () => {
  const uid = "<UID>";
  const ref = db.collection("system")
    .doc("integrations")
    .collection("withings_connected")
    .doc(uid);
  const snap = await ref.get();
  console.log("registryExists:", snap.exists);
})();
NODE

Expected:

registryExists: false
6. Backfill Status
node <<'NODE'
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'oli-staging-fdbba' });
const db = admin.firestore();
(async () => {
  const uid = "<UID>";
  const ref = db.collection("users").doc(uid)
    .collection("integrations").doc("withings");
  const snap = await ref.get();
  console.log(JSON.stringify(snap.data().backfill, null, 2));
})();
NODE

Fields:

status: running | complete | error

cursorStartSec

cursorEndSec

processedCount

lastError

Backfill moves newest → oldest.

7. Registry Consistency Rule

If:

integration.connected = true

Then:

system/integrations/withings_connected/{uid} MUST exist

If:

integration.connected = false

Then:

registry doc MUST NOT exist

This invariant prevents scheduler drift.

8. Expected Behaviors
Scenario	Expected Result
pull-now success	200 + counts
replay same Idempotency-Key	200 cached response
missing Idempotency-Key	400
refresh token invalid	connected=false + cleanup
measure API error	502
Firestore write failure	FailureEntry written