import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvents, getRawEvent } from "@/lib/api/usersMe";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { parseWorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { addCalendarDaysToDayKey, enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DailyFactsDto } from "@/lib/contracts";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import type { WorkoutRawForDayDerivation } from "@/lib/data/workouts/workoutsCalendarDayKey";
import { sortWorkoutsChronologicalAsc } from "@/lib/data/workouts/workoutsCalendarModel";
import { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "@/lib/data/workouts/workoutsCalendarApiConstants";

type RawEventKind = "workout" | "strength_workout";

export { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "@/lib/data/workouts/workoutsCalendarApiConstants";

/** Pad observedAt query window so payload.day / TZ-derived days still match the UI range. */
const OBSERVED_AT_PAD_DAYS = 21;

export type WorkoutCalendarAdapterOptions = {
  /**
   * Optional: include strength_workout RawEvents as workout markers.
   *
   * Repo-truth today treats strength_workout as a separate canonical kind used
   * for DailyFacts.strength. It is not yet unambiguously defined whether
   * strength_workout should count as a generic "workout day" marker.
   *
   * To avoid guessing, callers must opt in explicitly.
   */
  includeStrengthWorkouts?: boolean;
  /** Increment after server-side workout ingest so this range refetches RawEvents. */
  refreshEpoch?: number;
};

export type WorkoutCalendarDay = {
  day: DayKey;
  workouts: WorkoutHistoryItem[];
};

export type WorkoutCalendarRangeState =
  | { status: "partial" }
  | { status: "ready"; days: WorkoutCalendarDay[]; refreshing?: boolean }
  | { status: "error"; error: string; requestId: string | null };

const MAX_ITEMS_CAP = 2000;

function rangeShapeKey(uid: string, start: DayKey, end: DayKey, kindsSig: string): string {
  return `${uid}|${start}|${end}|${kindsSig}`;
}

/** Last successful range per shape — stale-while-refresh across refocus / refreshEpoch. */
const lastGoodRangeByShape = new Map<string, WorkoutCalendarDay[]>();

function clearRangeCachesForUidPrefix(uid: string): void {
  const p = `${uid}|`;
  for (const k of lastGoodRangeByShape.keys()) {
    if (k.startsWith(p)) lastGoodRangeByShape.delete(k);
  }
}

/** Clears in-memory range/day caches (Jest tests only; avoids cross-test leakage). */
export function resetWorkoutsCalendarCachesForTests(): void {
  lastGoodRangeByShape.clear();
  dayWorkoutsByUidDay.clear();
}

export function seedDayWorkoutsCacheForTests(
  uid: string,
  day: DayKey,
  workouts: WorkoutHistoryItem[],
): void {
  dayWorkoutsByUidDay.set(dayCacheKey(uid, day), sortWorkoutsChronologicalAsc(workouts));
}

const dayWorkoutsByUidDay = new Map<string, WorkoutHistoryItem[]>();

function dayCacheKey(uid: string, day: DayKey): string {
  return `${uid}|${day}`;
}

export function getCachedWorkoutsForDay(uid: string, day: DayKey): WorkoutHistoryItem[] {
  return dayWorkoutsByUidDay.get(dayCacheKey(uid, day)) ?? [];
}

function mergeWorkoutsIntoDayCache(uid: string, days: WorkoutCalendarDay[]): void {
  for (const d of days) {
    const k = dayCacheKey(uid, d.day);
    if (d.workouts.length === 0) {
      dayWorkoutsByUidDay.delete(k);
      continue;
    }
    const prev = dayWorkoutsByUidDay.get(k) ?? [];
    const byId = new Map<string, WorkoutHistoryItem>();
    for (const w of prev) byId.set(w.id, w);
    for (const w of d.workouts) byId.set(w.id, w);
    dayWorkoutsByUidDay.set(k, sortWorkoutsChronologicalAsc([...byId.values()]));
  }
}

async function hydrateWorkoutsForRange(
  kinds: RawEventKind[],
  start: DayKey,
  end: DayKey,
  idToken: string,
): Promise<{ ok: true; days: WorkoutCalendarDay[] } | { ok: false; error: string; requestId: string | null }> {
  const observedStart = addCalendarDaysToDayKey(start, -OBSERVED_AT_PAD_DAYS);
  const observedEnd = addCalendarDaysToDayKey(end, OBSERVED_AT_PAD_DAYS);

  const grouped: { day: DayKey; workout: WorkoutHistoryItem }[] = [];

  async function hydrateKind(kind: RawEventKind): Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }> {
    let cursor: string | null = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const listParams: {
        kind: RawEventKind;
        limit: number;
        cursor?: string;
        start: string;
        end: string;
      } = {
        kind,
        limit: WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE,
        start: observedStart,
        end: observedEnd,
      };
      if (cursor) listParams.cursor = cursor;

      const listRes = await getRawEvents(idToken, listParams);

      if (!listRes.ok) {
        return { ok: false, error: listRes.error, requestId: listRes.requestId };
      }

      const ids = listRes.json.items.map((i) => i.id);
      if (ids.length === 0) {
        cursor = listRes.json.nextCursor ?? null;
      } else {
        const rawDocsRes = await Promise.all(ids.map((id) => getRawEvent(id, idToken)));
        for (const res of rawDocsRes) {
          if (!res) continue;
          if (!res.ok) {
            return { ok: false, error: res.error, requestId: res.requestId };
          }

          const raw = res.json as WorkoutRawForDayDerivation & { kind?: string };
          const rawKind = raw.kind as RawEventKind | undefined;
          if (!rawKind || rawKind !== kind) continue;

          const dayKey = deriveWorkoutDayKey(raw);
          if (!dayKey) continue;
          if (dayKey < start || dayKey > end) continue;

          const item = parseWorkoutHistoryItem(res.json as never);
          grouped.push({ day: dayKey, workout: item });
          if (grouped.length > MAX_ITEMS_CAP) {
            return {
              ok: false,
              error: `Maximum ${MAX_ITEMS_CAP} workouts allowed for calendar range`,
              requestId: null,
            };
          }
        }
        cursor = listRes.json.nextCursor ?? null;
      }

      if (!cursor) break;
    }

    return { ok: true };
  }

  for (const kind of kinds) {
    const res = await hydrateKind(kind);
    if (!res.ok) return res as { ok: false; error: string; requestId: string | null };
  }

  const byDay = new Map<DayKey, WorkoutHistoryItem[]>();

  for (const entry of grouped) {
    const existing = byDay.get(entry.day) ?? [];
    existing.push(entry.workout);
    byDay.set(entry.day, existing);
  }

  const allDaysInRange = enumerateDaysInclusive(start, end);
  const days: WorkoutCalendarDay[] = allDaysInRange.map((day) => ({
    day,
    workouts: sortWorkoutsChronologicalAsc(byDay.get(day) ?? []),
  }));

  return { ok: true, days };
}

export function useWorkoutsCalendarRange(
  start: DayKey,
  end: DayKey,
  options?: WorkoutCalendarAdapterOptions,
): WorkoutCalendarRangeState {
  const { user, initializing, getIdToken } = useAuth();
  const [state, setState] = useState<WorkoutCalendarRangeState>({ status: "partial" });
  const seqRef = useRef(0);
  const prevUidRef = useRef<string | null>(null);

  const optsRef = useRef<WorkoutCalendarAdapterOptions | undefined>(options);
  optsRef.current = options;

  const fetchOnce = useCallback(async () => {
    const seq = ++seqRef.current;
    const safeSet = (next: WorkoutCalendarRangeState) => {
      if (seq === seqRef.current) setState(next);
    };

    if (!isValidDayKey(start) || !isValidDayKey(end) || start > end) {
      safeSet({
        status: "error",
        error: "Invalid calendar range",
        requestId: null,
      });
      return;
    }

    if (initializing || !user) {
      safeSet({ status: "partial" });
      return;
    }

    const uid = user.uid;
    if (prevUidRef.current !== uid) {
      if (prevUidRef.current) clearRangeCachesForUidPrefix(prevUidRef.current);
      prevUidRef.current = uid;
    }

    const kinds: RawEventKind[] =
      optsRef.current && optsRef.current.includeStrengthWorkouts === false
        ? ["workout"]
        : ["workout", "strength_workout"];
    const kindsSig = kinds.join(",");
    const shapeKey = rangeShapeKey(uid, start, end, kindsSig);
    const staleDays = lastGoodRangeByShape.get(shapeKey);

    const token = await getIdToken(false);
    if (!token || seq !== seqRef.current) return;

    if (staleDays) {
      safeSet({ status: "ready", days: staleDays, refreshing: true });
    } else {
      safeSet({ status: "partial" });
    }

    const res = await hydrateWorkoutsForRange(kinds, start, end, token);
    if (seq !== seqRef.current) return;

    if (!res.ok) {
      if (staleDays) {
        safeSet({ status: "ready", days: staleDays, refreshing: false });
      } else {
        safeSet({
          status: "error",
          error: res.error,
          requestId: res.requestId,
        });
      }
      return;
    }

    lastGoodRangeByShape.set(shapeKey, res.days);
    mergeWorkoutsIntoDayCache(uid, res.days);
    safeSet({ status: "ready", days: res.days, refreshing: false });
  }, [start, end, initializing, user, getIdToken, options?.refreshEpoch]);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, start, end, user?.uid, options?.refreshEpoch]);

  return state;
}

export type WorkoutDayDetailState =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; day: DayKey; workouts: WorkoutHistoryItem[]; dailyFacts?: DailyFactsDto };

export function useWorkoutDayDetail(
  day: DayKey,
  options?: WorkoutCalendarAdapterOptions,
): WorkoutDayDetailState {
  const { user } = useAuth();
  const rangeState = useWorkoutsCalendarRange(day, day, options);
  const dailyFacts = useDailyFacts(day);

  const uid = user?.uid ?? "";

  if (rangeState.status === "error") {
    return {
      status: "error",
      error: rangeState.error,
      requestId: rangeState.requestId,
    };
  }

  const rangeSettled = rangeState.status === "ready";
  const fromRange = rangeSettled
    ? sortWorkoutsChronologicalAsc(rangeState.days[0]?.workouts ?? [])
    : [];
  const fromCache = uid ? getCachedWorkoutsForDay(uid, day) : [];
  const workouts = rangeSettled
    ? fromRange
    : fromCache.length > 0
      ? sortWorkoutsChronologicalAsc(fromCache)
      : [];

  if (!rangeSettled && workouts.length === 0) {
    return { status: "partial" };
  }

  const dailyFactsDto =
    dailyFacts.status === "ready" && dailyFacts.data ? dailyFacts.data : undefined;

  return {
    status: "ready",
    day,
    workouts,
    ...(dailyFactsDto ? { dailyFacts: dailyFactsDto } : {}),
  };
}
