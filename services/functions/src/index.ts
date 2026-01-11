// services/functions/src/index.ts

import * as functionsV1 from "firebase-functions/v1";
import { setGlobalOptions } from "firebase-functions/v2";

import { admin, db } from "./firebaseAdmin";

// =============================
// Global options (v2 only)
// =============================
//
// NOTE:
// We no longer rely on setGlobalOptions() for IAM correctness because
// each Gen2 function explicitly sets { region, serviceAccount } in its
// own options object (approved strategy). This remains as a safe default.
setGlobalOptions({
  region: "us-central1",
  // Runtime service account for Gen2 functions (Cloud Run service identity)
  serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
});

// =============================
// Triggers & Scheduled Jobs (v2)
// =============================
//
// IMPORTANT:
// These are static ES imports so the module graph loads deterministically.
// IAM correctness is enforced per-function via explicit options objects.

// Firestore triggers
import { onRawEventCreated } from "./normalization/onRawEventCreated";
import { onCanonicalEventCreated } from "./realtime/onCanonicalEventCreated";

// Scheduled recompute jobs
import { onDailyFactsRecomputeScheduled } from "./dailyFacts/onDailyFactsRecomputeScheduled";
import { onInsightsRecomputeScheduled } from "./insights/onInsightsRecomputeScheduled";
import { onDailyIntelligenceContextRecomputeScheduled } from "./intelligence/onDailyIntelligenceContextRecomputeScheduled";

// Account executors (Pub/Sub)
import { onAccountDeleteRequested } from "./account/onAccountDeleteRequested";
import { onAccountExportRequested } from "./account/onAccountExportRequested";

// Admin-only HTTP endpoints
import { recomputeDailyFactsAdminHttp } from "./http/recomputeDailyFactsAdminHttp";
import { recomputeInsightsAdminHttp } from "./http/recomputeInsightsAdminHttp";
import { recomputeDailyIntelligenceContextAdminHttp } from "./http/recomputeDailyIntelligenceContextAdminHttp";

// =============================
// Helpers (v1)
// =============================

function defaultGeneralProfile(user: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();

  return {
    displayName: user.displayName ?? null,
    firstName: null as string | null,
    lastName: null as string | null,
    avatarUrl: null as string | null,
    email: user.email ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================
// v1 Auth Trigger
// =============================
//
// IMPORTANT:
// Move Gen1 Auth trigger off the App Engine Default Service Account.
// Sprint requirement: no default SAs with elevated permissions.
// This keeps logic identical; only runtime identity changes.
export const onAuthCreate = functionsV1
  .runWith({
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  })
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    const uid = user.uid;

    await db.doc(`users/${uid}/profile/general`).set(defaultGeneralProfile(user), {
      merge: true,
    });
  });

// =============================
// v2 Exports (DEPLOYED)
// =============================

// Firestore triggers
export { onRawEventCreated };
export { onCanonicalEventCreated };

// Scheduled recompute jobs
export { onDailyFactsRecomputeScheduled };
export { onInsightsRecomputeScheduled };
export { onDailyIntelligenceContextRecomputeScheduled };

// Account executors (Pub/Sub)
export { onAccountDeleteRequested };
export { onAccountExportRequested };

// Admin-only HTTP endpoints
export { recomputeDailyFactsAdminHttp };
export { recomputeInsightsAdminHttp };
export { recomputeDailyIntelligenceContextAdminHttp };
