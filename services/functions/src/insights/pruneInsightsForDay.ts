// services/functions/src/insights/pruneInsightsForDay.ts

import * as logger from "firebase-functions/logger";

import type { YmdDateString } from "../types/health";
import { computeInsightPrunePlan } from "./prunePlan";

const DELETE_BATCH_LIMIT = 450; // headroom under Firestore write batch limit (500)

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function pruneInsightsForDay(params: {
  userRef: FirebaseFirestore.DocumentReference;
  day: YmdDateString;
  keepIds: Set<string>;
}): Promise<{ deleted: number }> {
  const { userRef, day, keepIds } = params;

  const snap = await userRef.collection("insights").where("date", "==", day).get();

  const existingIds = snap.docs.map((d) => d.id);
  const plan = computeInsightPrunePlan({ existingIds, keepIds });

  if (plan.toDelete.length === 0) {
    return { deleted: 0 };
  }

  let deleted = 0;
  for (const ids of chunk(plan.toDelete, DELETE_BATCH_LIMIT)) {
    const batch = userRef.firestore.batch();
    for (const id of ids) {
      batch.delete(userRef.collection("insights").doc(id));
    }
    await batch.commit();
    deleted += ids.length;
  }

  logger.info("Insights pruned for day", {
    userId: userRef.id,
    day,
    deleted,
  });

  return { deleted };
}
