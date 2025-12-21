// services/functions/src/index.ts

import * as functionsV1 from "firebase-functions/v1";

import { admin, db } from "./firebaseAdmin";

// =============================
// Triggers & Scheduled Jobs
// =============================

// v2 Firestore trigger (RawEvent → CanonicalEvent)
import { onRawEventCreated } from "./normalization/onRawEventCreated";

// v2 Firestore trigger (CanonicalEvent → DailyFacts → Insights → IntelligenceContext, realtime)
import { onCanonicalEventCreated } from "./realtime/onCanonicalEventCreated";

// v2 Scheduled jobs (Canonical → DailyFacts → Insights → IntelligenceContext)
import { onDailyFactsRecomputeScheduled } from "./dailyFacts/onDailyFactsRecomputeScheduled";
import { onInsightsRecomputeScheduled } from "./insights/onInsightsRecomputeScheduled";
import { onDailyIntelligenceContextRecomputeScheduled } from "./intelligence/onDailyIntelligenceContextRecomputeScheduled";

// =============================
// Admin HTTP Endpoints
// (Internal / Admin-only)
// =============================

import { recomputeDailyFactsAdminHttp } from "./http/recomputeDailyFactsAdminHttp";
import { recomputeInsightsAdminHttp } from "./http/recomputeInsightsAdminHttp";
import { recomputeDailyIntelligenceContextAdminHttp } from "./http/recomputeDailyIntelligenceContextAdminHttp";

// =============================
// Helpers
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

export const onAuthCreate = functionsV1.auth.user().onCreate(async (user) => {
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

// Admin-only HTTP endpoints
export { recomputeDailyFactsAdminHttp };
export { recomputeInsightsAdminHttp };
export { recomputeDailyIntelligenceContextAdminHttp };
