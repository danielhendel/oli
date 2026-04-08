/**
 * When users/me/dailyFacts/{day} is missing, synthesize `activity.steps` from canonical
 * `events` for that day (same sum as {@link aggregateDailyFactsForDay} for steps-only).
 * Read-only; does not write Firestore. Mirrors the body synthesis path on GET /daily-facts.
 */

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

  let sum = 0;
  let any = false;
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data["kind"] !== "steps") continue;
    const s = data["steps"];
    if (typeof s === "number" && Number.isFinite(s)) {
      sum += s;
      any = true;
    }
  }

  if (!any) return undefined;
  return { steps: sum };
}
