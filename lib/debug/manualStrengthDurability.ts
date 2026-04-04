import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import { getRawEvents } from "@/lib/api/usersMe";
import type { RawEventDoc } from "@oli/contracts";
import type { ApiResult } from "@/lib/api/http";

/**
 * Dev-only durability helpers for manual strength_workout ingest.
 * Do not use in production user flows except guarded by __DEV__.
 */

export function countStrengthWorkoutPayloadExercises(payload: unknown): number {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const ex = (payload as { exercises?: unknown }).exercises;
  if (!Array.isArray(ex)) return 0;
  return ex.length;
}

export type GetRawEventFn = (
  id: string,
  idToken: string,
) => Promise<ApiResult<RawEventDoc> | null | undefined>;

/**
 * After POST /ingest returns rawEventId, GET the doc and assert it is a readable strength_workout.
 * Logs loudly in __DEV__; throws in __DEV__ when verification fails (surfaces silent ingest bugs).
 */
export async function devVerifyManualStrengthWorkoutPersisted(args: {
  getRawEvent: GetRawEventFn;
  idToken: string;
  rawEventId: string;
  expectedMinExerciseCount?: number;
}): Promise<void> {
  if (!__DEV__ || process.env.JEST_WORKER_ID) return;

  const { getRawEvent, idToken, rawEventId, expectedMinExerciseCount } = args;
  let res: Awaited<ReturnType<GetRawEventFn>> | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 400));
    }
    res = await getRawEvent(rawEventId, idToken);
    if (res != null && res.ok) break;
  }
  if (res == null || !res.ok) {
    const errMsg = `[MANUAL_STRENGTH_DURABILITY] VERIFY_FAIL: getRawEvent failed id=${rawEventId} ${res && !res.ok ? res.error : "no_response"}`;
    // eslint-disable-next-line no-console
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const doc = res.json;
  const derivedDay = deriveWorkoutDayKey({ observedAt: doc.observedAt, payload: doc.payload });
  const exCount = countStrengthWorkoutPayloadExercises(doc.payload);

  // eslint-disable-next-line no-console
  console.log("[MANUAL_STRENGTH_DURABILITY] verify_ok", {
    rawEventId: doc.id,
    kind: doc.kind,
    observedAt: doc.observedAt,
    derivedWorkoutDayKey: derivedDay,
    exerciseCount: exCount,
    displayName:
      doc.payload != null &&
      typeof doc.payload === "object" &&
      !Array.isArray(doc.payload) &&
      typeof (doc.payload as { displayName?: unknown }).displayName === "string"
        ? (doc.payload as { displayName: string }).displayName
        : null,
  });

  if (doc.kind !== "strength_workout") {
    const msg = `[MANUAL_STRENGTH_DURABILITY] VERIFY_FAIL: expected kind strength_workout got ${String(doc.kind)}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }

  if (expectedMinExerciseCount != null && exCount < expectedMinExerciseCount) {
    const msg = `[MANUAL_STRENGTH_DURABILITY] VERIFY_FAIL: exerciseCount ${exCount} < expected ${expectedMinExerciseCount}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }
}

export type ManualStrengthProbeRow = {
  id: string;
  observedAt: string;
  exerciseCount: number;
  displayName: string | null;
};

/**
 * Lists the most recent manual strength_workout raw rows (single page, includePayload) for dev inspection.
 */
export async function devProbeRecentManualStrengthWorkouts(
  idToken: string,
  maxRows = 15,
): Promise<{ ok: true; rows: ManualStrengthProbeRow[] } | { ok: false; error: string }> {
  if (!__DEV__) return { ok: true, rows: [] };
  const res = await getRawEvents(idToken, {
    kind: "strength_workout",
    limit: 100,
    includePayload: true,
  });
  if (!res.ok) return { ok: false, error: res.error };
  const rows: ManualStrengthProbeRow[] = [];
  for (const item of res.json.items) {
    if (rows.length >= maxRows) break;
    const p = "payload" in item ? item.payload : undefined;
    rows.push({
      id: item.id,
      observedAt: item.observedAt,
      exerciseCount: countStrengthWorkoutPayloadExercises(p),
      displayName:
        p != null &&
        typeof p === "object" &&
        !Array.isArray(p) &&
        typeof (p as { displayName?: unknown }).displayName === "string"
          ? (p as { displayName: string }).displayName
          : null,
    });
  }
  return { ok: true, rows };
}
