// services/functions/src/index.ts

import * as functionsV1 from 'firebase-functions/v1';
import { admin, db } from './firebaseAdmin';
import { onRawEventCreated } from './normalization/onRawEventCreated';
import { onDailyFactsRecomputeScheduled } from './dailyFacts/onDailyFactsRecomputeScheduled';
import { onInsightsRecomputeScheduled } from './insights/onInsightsRecomputeScheduled';

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

// v1 Auth trigger
export const onAuthCreate = functionsV1.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  await db
    .doc(`users/${uid}/profile/general`)
    .set(defaultGeneralProfile(user), { merge: true });
});

// v2 Firestore trigger for normalization pipeline
export { onRawEventCreated };

// v2 scheduled jobs
export { onDailyFactsRecomputeScheduled };
export { onInsightsRecomputeScheduled };
