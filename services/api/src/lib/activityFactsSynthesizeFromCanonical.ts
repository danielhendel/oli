/**
 * When users/me/dailyFacts/{day} is missing (or activity is merged), synthesize `activity.steps`
 * from canonical `events` for that day — same resolution rules as {@link aggregateDailyFactsForDay}.
 * Read-only; does not write Firestore.
 */

import {
  pickContributingStepEventsForDailyFacts,
  resolvedStepsTotalFromContributing,
} from "@oli/contracts";
import { userCollection } from "../db";

export type ActivityStepsSynthesized = { steps: number };

/**
 * @returns `undefined` when there are no `kind: "steps"` canonical events for `dayKey`.
 */
export async function loadActivityStepsFromCanonicalForApi(
  uid: string,
  dayKey: string,
): Promise<ActivityStepsSynthesized | undefined> {
  const snap = await userCollection(uid, "events").where("day", "==", dayKey).get();

  const likes: { id: string; sourceId: string; steps: number }[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data["kind"] !== "steps") continue;
    const s = data["steps"];
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0) continue;
    const rawSource = data["sourceId"];
    const sourceId =
      typeof rawSource === "string" && rawSource.length > 0 ? rawSource : "unknown_source";
    likes.push({ id: d.id, sourceId, steps: s });
  }

  const contributing = pickContributingStepEventsForDailyFacts(likes);
  if (contributing.length === 0) return undefined;
  return { steps: resolvedStepsTotalFromContributing(contributing) };
}
