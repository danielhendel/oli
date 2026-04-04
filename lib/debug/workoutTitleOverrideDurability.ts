import type { ApiResult } from "@/lib/api/http";
import { getRawEvents } from "@/lib/api/usersMe";
import type { RawEventDoc } from "@oli/contracts";

export type GetRawEventFn = (
  id: string,
  idToken: string,
) => Promise<ApiResult<RawEventDoc> | null | undefined>;

export async function devVerifyWorkoutTitleOverridePersisted(args: {
  getRawEvent: GetRawEventFn;
  idToken: string;
  rawEventId: string;
  expectedTargetId: string;
  expectedDisplayName: string;
}): Promise<void> {
  if (!__DEV__ || process.env.JEST_WORKER_ID) return;

  const { getRawEvent, idToken, rawEventId, expectedTargetId, expectedDisplayName } = args;
  let res: Awaited<ReturnType<GetRawEventFn>> | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 400));
    }
    res = await getRawEvent(rawEventId, idToken);
    if (res != null && res.ok) break;
  }
  if (res == null || !res.ok) {
    const errMsg = `[WORKOUT_TITLE_OVERRIDE_DURABILITY] VERIFY_FAIL: getRawEvent failed id=${rawEventId} ${res && !res.ok ? res.error : "no_response"}`;
    // eslint-disable-next-line no-console
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const doc = res.json;
  const p = doc.payload;
  const payload =
    p != null && typeof p === "object" && !Array.isArray(p)
      ? (p as { targetWorkoutId?: unknown; displayName?: unknown })
      : null;

  // eslint-disable-next-line no-console
  console.log("[WORKOUT_TITLE_OVERRIDE_DURABILITY] verify_ok", {
    rawEventId: doc.id,
    kind: doc.kind,
    targetWorkoutId: payload?.targetWorkoutId ?? null,
    displayName: payload?.displayName ?? null,
  });

  if (doc.kind !== "workout_title_override") {
    const msg = `[WORKOUT_TITLE_OVERRIDE_DURABILITY] VERIFY_FAIL: expected kind workout_title_override got ${String(doc.kind)}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }
  if (
    typeof payload?.targetWorkoutId !== "string" ||
    payload.targetWorkoutId !== expectedTargetId ||
    typeof payload.displayName !== "string" ||
    payload.displayName !== expectedDisplayName
  ) {
    const msg = `[WORKOUT_TITLE_OVERRIDE_DURABILITY] VERIFY_FAIL: payload mismatch`;
    // eslint-disable-next-line no-console
    console.error(msg, { expectedTargetId, expectedDisplayName, payload });
    throw new Error(msg);
  }
}

export type WorkoutTitleOverrideProbeRow = {
  id: string;
  observedAt: string;
  targetWorkoutId: string | null;
  displayName: string | null;
};

export async function devProbeRecentWorkoutTitleOverrides(
  idToken: string,
  maxRows = 15,
): Promise<{ ok: true; rows: WorkoutTitleOverrideProbeRow[] } | { ok: false; error: string }> {
  if (!__DEV__) return { ok: true, rows: [] };
  const res = await getRawEvents(idToken, {
    kind: "workout_title_override",
    limit: 100,
    includePayload: true,
  });
  if (!res.ok) return { ok: false, error: res.error };
  const rows: WorkoutTitleOverrideProbeRow[] = [];
  for (const item of res.json.items) {
    if (rows.length >= maxRows) break;
    const p = item.payload;
    const payload =
      p != null && typeof p === "object" && !Array.isArray(p)
        ? (p as { targetWorkoutId?: unknown; displayName?: unknown })
        : null;
    rows.push({
      id: item.id,
      observedAt: item.observedAt,
      targetWorkoutId:
        typeof payload?.targetWorkoutId === "string" ? payload.targetWorkoutId : null,
      displayName: typeof payload?.displayName === "string" ? payload.displayName : null,
    });
  }
  return { ok: true, rows };
}
