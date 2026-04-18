/**
 * Read-only helper: resolve `activity.steps` from canonical `events` for a day using the same rules
 * as `aggregateDailyFactsForDay` (including Apple per-identity dedupe in `@oli/contracts`).
 * Optional tooling / non-GET-daily-facts callers only; `GET /users/me/daily-facts` does not use this.
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

  const likes: {
    id: string;
    sourceId: string;
    steps: number;
    updatedAt?: string;
    createdAt?: string;
    sourceSampleId?: string | null;
  }[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data["kind"] !== "steps") continue;
    const s = data["steps"];
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0) continue;
    const rawSource = data["sourceId"];
    const sourceId =
      typeof rawSource === "string" && rawSource.length > 0 ? rawSource : "unknown_source";
    const updatedAt = typeof data["updatedAt"] === "string" ? data["updatedAt"] : undefined;
    const createdAt = typeof data["createdAt"] === "string" ? data["createdAt"] : undefined;
    const rawSid = data["sourceSampleId"];
    const sourceSampleId = typeof rawSid === "string" && rawSid.trim().length > 0 ? rawSid.trim() : null;
    likes.push({
      id: d.id,
      sourceId,
      steps: s,
      sourceSampleId,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
      ...(createdAt !== undefined ? { createdAt } : {}),
    });
  }

  const contributing = pickContributingStepEventsForDailyFacts(likes);
  if (contributing.length === 0) return undefined;
  return { steps: resolvedStepsTotalFromContributing(contributing) };
}
