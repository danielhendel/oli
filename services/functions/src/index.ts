// services/functions/src/index.ts

import * as functionsV1 from 'firebase-functions/v1';

import { admin, db } from './firebaseAdmin';

// -----------------------------
// Triggers & Scheduled Jobs
// -----------------------------

// v2 Firestore trigger (Event → Canonical)
import { onRawEventCreated } from './normalization/onRawEventCreated';

// v2 Scheduled jobs (Canonical → DailyFacts → Insights)
import { onDailyFactsRecomputeScheduled } from './dailyFacts/onDailyFactsRecomputeScheduled';
import { onInsightsRecomputeScheduled } from './insights/onInsightsRecomputeScheduled';

// -----------------------------
// Admin HTTP Endpoints (Sprint 6)
// -----------------------------

import { recomputeDailyFactsAdminHttp } from './http/recomputeDailyFactsAdminHttp';
import { recomputeInsightsAdminHttp } from './http/recomputeInsightsAdminHttp';

// -----------------------------
// Helpers
// -----------------------------

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

// -----------------------------
// v1 Auth Trigger
// -----------------------------

/**
 * Creates the initial user profile scaffold on auth creation.
 *
 * NOTE:
 * - Kept as v1 intentionally (auth triggers are stable here)
 * - No business logic beyond profile initialization
 */
export const onAuthCreate = functionsV1.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  await db
    .doc(`users/${uid}/profile/general`)
    .set(defaultGeneralProfile(user), { merge: true });
});

// -----------------------------
// v2 Exports (must be exported to deploy)
// -----------------------------

// Firestore trigger
export { onRawEventCreated };

// Scheduled jobs
export { onDailyFactsRecomputeScheduled };
export { onInsightsRecomputeScheduled };

// Admin-only HTTP endpoints
export { recomputeDailyFactsAdminHttp };
export { recomputeInsightsAdminHttp };
