/**
 * When dailyFacts is missing, synthesize `activity.steps` from the Apple Health daily steps
 * rawEvent at the deterministic id used by POST /ingest (see mobile `stepsIdempotencyKey`).
 * Read-only; does not write Firestore. Same class of fallback as {@link loadBodyFactsFromRawForApi}.
 */

import { userCollection } from "../db";

export type ActivityStepsSynthesized = { steps: number };

/** Must stay aligned with `PREFIX` + `:steps:` + day in `lib/integrations/appleHealth/idempotency.ts`. */
export function appleHealthDailyStepsRawEventId(dayKey: string): string {
  return `appleHealth:v2:steps:${dayKey}`;
}

/**
 * @returns `undefined` when the expected raw doc is missing or not a valid apple_health steps payload.
 */
export async function loadActivityStepsFromRawForApi(
  uid: string,
  dayKey: string,
): Promise<ActivityStepsSynthesized | undefined> {
  const docId = appleHealthDailyStepsRawEventId(dayKey);
  const snap = await userCollection(uid, "rawEvents").doc(docId).get();
  if (!snap.exists) return undefined;

  const data = snap.data() as Record<string, unknown>;
  if (data["kind"] !== "steps") return undefined;
  if (data["provider"] !== "apple_health") return undefined;

  const payload = data["payload"] as Record<string, unknown> | undefined;
  const steps = payload?.["steps"];
  if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) return undefined;

  return { steps: Math.round(steps) };
}
