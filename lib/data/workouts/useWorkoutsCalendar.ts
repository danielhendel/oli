import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getRawEvents,
  getRawEvent,
  getWorkoutDaySummaries,
  postWorkoutDaySummariesRebuild,
} from "@/lib/api/usersMe";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { parseWorkoutHistoryItem, resolveWorkoutIngestProvider } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { addCalendarDaysToDayKey, enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DailyFactsDto, RawEventDoc, RawEventListItem } from "@/lib/contracts";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import type { WorkoutRawForDayDerivation } from "@/lib/data/workouts/workoutsCalendarDayKey";
import { sortWorkoutsChronologicalAsc } from "@/lib/data/workouts/workoutsCalendarModel";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "@/lib/data/workouts/workoutsCalendarApiConstants";
import { observedAtPadDaysForWorkoutCalendarRange } from "@/lib/data/workouts/workoutsCalendarObservedAtPad";
import type { WorkoutCalendarRawEventKind } from "@/lib/data/workouts/workoutsCalendarRawEventKinds";
import { resolveWorkoutCalendarRawEventKinds } from "@/lib/data/workouts/workoutsCalendarRawEventKinds";
import {
  getWorkoutTruthTargetConfig,
  rawEventIdMatchesTruthTargets,
} from "@/lib/debug/workoutTruthTargets";
import {
  WORKOUT_DAY_DEBUG_DATES,
  isWorkoutDayDebugDate,
  logWorkoutDayDebug,
  workoutDayDebugEnabled,
  workoutDayDebugFixRevision,
  workoutDayDebugPayloadStartedAt,
  workoutDayDebugRangeOverlaps,
  workoutDayDebugRowTouchesAuditDates,
} from "@/lib/debug/workoutDayDebug";
import { clearAllWorkoutCalendarMarkerCaches } from "@/lib/data/workouts/workoutsCalendarMarkerCache";
import { WORKOUT_DAY_SUMMARY_EXPECTED } from "@oli/contracts";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import { subscribeWorkoutCalendarHydrateInvalidate } from "@/lib/data/workouts/workoutCalendarHydrateInvalidate";
import {
  durableTitleOverrideMapToRecord,
  mergeWorkoutTitleOverrideListRow,
  type DurableTitleOverrideAccumulator,
} from "@/lib/data/workouts/workoutTitleOverridesFromRaw";

export { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "@/lib/data/workouts/workoutsCalendarApiConstants";

export {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  resolveWorkoutCalendarRawEventKinds,
} from "@/lib/data/workouts/workoutsCalendarRawEventKinds";
export type { WorkoutCalendarRawEventKind } from "@/lib/data/workouts/workoutsCalendarRawEventKinds";

export { observedAtPadDaysForWorkoutCalendarRange } from "@/lib/data/workouts/workoutsCalendarObservedAtPad";

/** Must stay ≤ API `workout-day-summaries` max range; otherwise skip summary-first hydrate. */
const WORKOUT_DAY_SUMMARY_CLIENT_MAX_RANGE_DAYS = 900;

/**
 * When summaries are incomplete, one server rebuild is attempted for ranges up to this many days
 * (bounds write/query load; wide history still uses raw fallback until a dedicated backfill).
 */
const WORKOUT_DAY_SUMMARY_REBUILD_MAX_DAYS = 120;

export type WorkoutCalendarAdapterOptions = {
  /**
   * Raw kinds to list/hydrate for this range. Default: {@link DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS}.
   * Tests may pass a subset (e.g. `["workout"]` only).
   */
  rawEventKinds?: readonly WorkoutCalendarRawEventKind[];
  /** Increment after server-side workout ingest so this range refetches RawEvents. */
  refreshEpoch?: number;
  /**
   * DEV: label for `[WORKOUT_TRUTH_DEBUG] hydrate-target-*` logs when
   * `EXPO_PUBLIC_WORKOUT_TRUTH_TARGET_RAW_EVENT_IDS` / `_PREFIXES` are set.
   */
  debugHydrateLabel?: string;
  /**
   * Calendar: try compact workout-day summaries before raw-event hydration when coverage is complete.
   */
  preferWorkoutDaySummaries?: boolean;
};

export type WorkoutCalendarDay = {
  day: DayKey;
  workouts: WorkoutHistoryItem[];
};

export type WorkoutCalendarRangeState =
  | { status: "partial" }
  | {
      status: "ready";
      days: WorkoutCalendarDay[];
      refreshing?: boolean;
      /** Present when markers were loaded from summary docs (workouts[] empty for those days). */
      markerFlagsByDay?: Record<DayKey, WorkoutMarkerFlags>;
      /** Latest durable display title per target workout raw id (`workout_title_override`). */
      durableTitlesByWorkoutId: Record<string, string>;
    }
  | { status: "error"; error: string; requestId: string | null };

type CachedWorkoutCalendarRange = {
  days: WorkoutCalendarDay[];
  markerFlagsByDay?: Record<DayKey, WorkoutMarkerFlags>;
  durableTitlesByWorkoutId: Record<string, string>;
};

const MAX_ITEMS_CAP = 2000;

function rangeShapeKey(uid: string, start: DayKey, end: DayKey, kindsSig: string): string {
  return `${uid}|${start}|${end}|${kindsSig}`;
}

/** Last successful range per shape — stale-while-refresh across refocus / refreshEpoch. */
const lastGoodRangeByShape = new Map<string, CachedWorkoutCalendarRange>();

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
  void clearAllWorkoutCalendarMarkerCaches();
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
    if (workoutDayDebugEnabled() && isWorkoutDayDebugDate(d.day)) {
      logWorkoutDayDebug("merge-cache-row", {
        day: d.day,
        incomingHydrateWorkoutIds: d.workouts.map((w) => w.id),
        perDayCacheIdsBeforeMerge: getCachedWorkoutsForDay(uid, d.day).map((w) => w.id),
        emptyIncomingPreservesCache: true,
      });
    }
    if (d.workouts.length === 0) {
      /**
       * Do not delete existing per-day cache. An empty bucket usually means the `observedAt`
       * list window missed raw docs that still belong on this calendar day (see
       * `deriveWorkoutDayKey` vs API filter), not that the user has zero workouts. Overview
       * hydrates may have populated this key from a wider window.
       */
      continue;
    }
    const prev = dayWorkoutsByUidDay.get(k) ?? [];
    const byId = new Map<string, WorkoutHistoryItem>();
    for (const w of prev) byId.set(w.id, w);
    for (const w of d.workouts) byId.set(w.id, w);
    dayWorkoutsByUidDay.set(k, sortWorkoutsChronologicalAsc([...byId.values()]));
    if (workoutDayDebugEnabled() && isWorkoutDayDebugDate(d.day)) {
      logWorkoutDayDebug("merge-cache-row-after", {
        day: d.day,
        perDayCacheIdsAfterMerge: dayWorkoutsByUidDay.get(k)?.map((w) => w.id) ?? [],
      });
    }
  }
}

function workoutTruthPayloadPreview(payload: unknown): Record<string, unknown> {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return {};
  const p = payload as Record<string, unknown>;
  return {
    day: p.day,
    start: p.start,
    end: p.end,
    timezone: p.timezone,
    timeZone: p.timeZone,
  };
}

/** Lexicographic ISO compare vs UTC day bounds (matches server parseStartEndAsIso for YYYY-MM-DD). */
function observedAtLikelyInsideDayKeyWindow(observedAt: string, startDay: DayKey, endDay: DayKey): boolean {
  const lo = `${startDay}T00:00:00.000Z`;
  const hi = `${endDay}T23:59:59.999Z`;
  return observedAt >= lo && observedAt <= hi;
}

type TruthTrace = {
  seenInListIds: Set<string>;
  includedIds: Set<string>;
  lastDropById: Map<string, string>;
};

type PostListDropPoint =
  | "kind_mismatch"
  | "deriveWorkoutDayKey_null"
  | "dayKey_outside_ui_range"
  | "included_into_grouped";

/** Single-line proof for EXPO_PUBLIC_WORKOUT_TRUTH_TARGET_* ids: post-list pipeline only. */
function emitHydrateTargetPostListTrace(args: {
  debugHydrateLabel: string;
  targetRawEventId: string;
  requestedUiStart: DayKey;
  requestedUiEnd: DayKey;
  listKindBeingHydrated: WorkoutCalendarRawEventKind;
  raw: WorkoutRawForDayDerivation & { kind?: string; sourceId?: string };
  derivedDayKey: DayKey | null;
  dropPoint: PostListDropPoint;
  parseInvoked: boolean;
  parsedItem: WorkoutHistoryItem | null;
  insertedIntoGrouped: boolean;
  groupedBucketDayKey: DayKey | null;
}): void {
  if (!__DEV__ || process.env.JEST_WORKER_ID) return;
  const p = workoutTruthPayloadPreview(args.raw.payload);
  const { derivedDayKey, requestedUiStart, requestedUiEnd } = args;
  const dayKeyOutsideUi =
    derivedDayKey == null ? null : derivedDayKey < requestedUiStart || derivedDayKey > requestedUiEnd;
  // eslint-disable-next-line no-console
  console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-post-list-trace", {
    debugHydrateLabel: args.debugHydrateLabel,
    targetRawEventId: args.targetRawEventId,
    requestedUiStart,
    requestedUiEnd,
    listKindBeingHydrated: args.listKindBeingHydrated,
    rawObservedAt: args.raw.observedAt,
    payloadStart: p.start ?? null,
    payloadEnd: p.end ?? null,
    payloadDay: p.day ?? null,
    payloadTimezone: p.timezone ?? null,
    payloadTimeZone: p.timeZone ?? null,
    docKind: args.raw.kind ?? null,
    kindMatchesListRow: Boolean(args.raw.kind && args.raw.kind === args.listKindBeingHydrated),
    deriveWorkoutDayKey: derivedDayKey,
    dayKeyOutsideRequestedUiRange: dayKeyOutsideUi,
    parseWorkoutHistoryItemInvoked: args.parseInvoked,
    /** Contract: parseWorkoutHistoryItem never returns null (always WorkoutHistoryItem). */
    parseWorkoutHistoryItemReturnsNull: args.parseInvoked ? false : "n_a_not_invoked",
    parsedItemId: args.parsedItem?.id ?? null,
    parsedItemStart: args.parsedItem?.start ?? null,
    postListDropPoint: args.dropPoint,
    insertedIntoGroupedArray: args.insertedIntoGrouped,
    groupedBucketDayKey: args.groupedBucketDayKey,
  });
}

function rawListItemIncludesPayload(
  item: RawEventListItem,
): item is RawEventListItem & { payload: unknown } {
  return "payload" in item && item.payload !== undefined;
}

/** Enough for {@link parseWorkoutHistoryItem} + {@link deriveWorkoutDayKey} on this path. */
function rawListItemToParseableDoc(item: RawEventListItem & { payload: unknown }): RawEventDoc {
  const resolvedProvider = resolveWorkoutIngestProvider({ provider: "", sourceId: item.sourceId }) ?? "";
  return {
    schemaVersion: 1,
    id: item.id,
    userId: item.userId,
    sourceId: item.sourceId,
    provider: resolvedProvider,
    sourceType: "",
    kind: item.kind,
    observedAt: item.observedAt,
    receivedAt: item.receivedAt,
    payload: item.payload,
    ...(item.recordedAt !== undefined ? { recordedAt: item.recordedAt } : {}),
    ...(item.provenance !== undefined ? { provenance: item.provenance } : {}),
    ...(item.uncertaintyState !== undefined ? { uncertaintyState: item.uncertaintyState } : {}),
    ...(item.contentUnknown !== undefined ? { contentUnknown: item.contentUnknown } : {}),
    ...(item.correctionOfRawEventId !== undefined
      ? { correctionOfRawEventId: item.correctionOfRawEventId }
      : {}),
  } as RawEventDoc;
}

async function hydrateDurableTitleOverrideMap(
  observedStart: DayKey,
  observedEnd: DayKey,
  idToken: string,
): Promise<Record<string, string>> {
  const acc: DurableTitleOverrideAccumulator = new Map();
  let cursor: string | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const listParams: {
      kind: string;
      limit: number;
      cursor?: string;
      start: string;
      end: string;
      includePayload: boolean;
    } = {
      kind: "workout_title_override",
      limit: WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE,
      start: observedStart,
      end: observedEnd,
      includePayload: true,
    };
    if (cursor) listParams.cursor = cursor;

    const listRes = await getRawEvents(idToken, listParams);
    if (!listRes.ok) {
      if (__DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.warn("[workout_title_override] raw-events list failed", listRes.error);
      }
      return durableTitleOverrideMapToRecord(acc);
    }

    for (const row of listRes.json.items) {
      mergeWorkoutTitleOverrideListRow(acc, row);
    }
    cursor = listRes.json.nextCursor ?? null;
    if (!cursor) break;
  }
  return durableTitleOverrideMapToRecord(acc);
}

async function hydrateWorkoutsForRange(
  kinds: WorkoutCalendarRawEventKind[],
  start: DayKey,
  end: DayKey,
  idToken: string,
  debugHydrateLabel?: string,
): Promise<
  | { ok: true; days: WorkoutCalendarDay[]; durableTitlesByWorkoutId: Record<string, string> }
  | { ok: false; error: string; requestId: string | null }
> {
  const overviewSharedHydrateWallStart =
    __DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel === "overview-shared" ? Date.now() : null;
  const observedPad = observedAtPadDaysForWorkoutCalendarRange(start, end);
  const observedStart = addCalendarDaysToDayKey(start, -observedPad);
  const observedEnd = addCalendarDaysToDayKey(end, observedPad);
  const truthCfg = getWorkoutTruthTargetConfig();
  const truthTrace: TruthTrace = {
    seenInListIds: new Set(),
    includedIds: new Set(),
    lastDropById: new Map(),
  };

  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] range-hydrate", {
      requestedDayStart: start,
      requestedDayEnd: end,
      observedAtWindowStart: observedStart,
      observedAtWindowEnd: observedEnd,
      rawEventKinds: kinds,
      debugHydrateLabel: debugHydrateLabel ?? null,
      truthTargetsConfigured: Boolean(truthCfg),
    });
  }

  if (workoutDayDebugEnabled() && workoutDayDebugRangeOverlaps(start, end)) {
    logWorkoutDayDebug("range-hydrate-begin", {
      requestedDay: start === end ? start : null,
      requestedUiStart: start,
      requestedUiEnd: end,
      observedAtListWindowStart: observedStart,
      observedAtListWindowEnd: observedEnd,
      observedAtPadDays: observedPad,
      kindFilters: kinds,
      debugHydrateLabel: debugHydrateLabel ?? null,
      ...workoutDayDebugFixRevision(),
      note:
        "Rows come from GET /raw-events (observedAt window). Calendar day uses deriveWorkoutDayKey. Mismatch → row can be missing from this query.",
    });
  }

  const grouped: { day: DayKey; workout: WorkoutHistoryItem }[] = [];
  let totalRawEventListRowsFetched = 0;
  let totalRawEventDocFetches = 0;

  async function hydrateKind(
    kind: WorkoutCalendarRawEventKind,
  ): Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }> {
    let cursor: string | null = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const listParams: {
        kind: WorkoutCalendarRawEventKind;
        limit: number;
        cursor?: string;
        start: string;
        end: string;
        includePayload: boolean;
      } = {
        kind,
        limit: WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE,
        start: observedStart,
        end: observedEnd,
        includePayload: true,
      };
      if (cursor) listParams.cursor = cursor;

      if (__DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_TRUTH_DEBUG] raw-events-list-query", {
          kind: listParams.kind,
          start: listParams.start,
          end: listParams.end,
          limit: listParams.limit,
          cursor: listParams.cursor ?? null,
          debugHydrateLabel: debugHydrateLabel ?? null,
        });
      }

      const listRes = await getRawEvents(idToken, listParams);

      if (!listRes.ok) {
        return { ok: false, error: listRes.error, requestId: listRes.requestId };
      }

      const rows = listRes.json.items;
      totalRawEventListRowsFetched += rows.length;
      if (truthCfg && __DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel) {
        const ids = rows.map((r) => r.id);
        const hits = ids.filter((id) => rawEventIdMatchesTruthTargets(id, truthCfg));
        for (const h of hits) truthTrace.seenInListIds.add(h);
        if (hits.length > 0) {
          // eslint-disable-next-line no-console
          console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-in-list-page", {
            debugHydrateLabel,
            listKind: kind,
            requestedUiStart: start,
            requestedUiEnd: end,
            paddedListStartDay: observedStart,
            paddedListEndDay: observedEnd,
            cursor: listParams.cursor ?? null,
            pageListedCount: ids.length,
            matchingTargetIdsInPage: hits,
          });
        }
      }

      if (rows.length === 0) {
        cursor = listRes.json.nextCursor ?? null;
      } else {
        const resolvedDocs: RawEventDoc[] = new Array(rows.length);
        const needFetchIdx: number[] = [];
        for (let idx = 0; idx < rows.length; idx += 1) {
          const row = rows[idx]!;
          if (rawListItemIncludesPayload(row)) {
            resolvedDocs[idx] = rawListItemToParseableDoc(row);
          } else {
            needFetchIdx.push(idx);
          }
        }

        totalRawEventDocFetches += needFetchIdx.length;
        if (needFetchIdx.length > 0) {
          const fetched = await Promise.all(needFetchIdx.map((idx) => getRawEvent(rows[idx]!.id, idToken)));
          for (let j = 0; j < needFetchIdx.length; j += 1) {
            const idx = needFetchIdx[j]!;
            const res = fetched[j];
            if (!res) {
              return { ok: false, error: "Missing raw event response", requestId: null };
            }
            if (!res.ok) {
              return { ok: false, error: res.error, requestId: res.requestId };
            }
            resolvedDocs[idx] = res.json;
          }
        }

        for (let i = 0; i < rows.length; i += 1) {
          const id = rows[i]!.id;
          const resJson = resolvedDocs[i]!;
          const raw = resJson as WorkoutRawForDayDerivation & { kind?: string; sourceId?: string };
          const isTarget = rawEventIdMatchesTruthTargets(id, truthCfg);
          const derivedDayKey = deriveWorkoutDayKey(raw);
          const rawKind = raw.kind as WorkoutCalendarRawEventKind | undefined;
          const dbgTouch = workoutDayDebugRowTouchesAuditDates({
            observedAt: raw.observedAt,
            payload: raw.payload,
            derivedDayKey,
          });
          const dbgRowBase = (): Record<string, unknown> => ({
            rawEventId: id,
            listKind: kind,
            docKind: raw.kind ?? null,
            sourceId: raw.sourceId ?? null,
            observedAt: raw.observedAt,
            payloadStartedAt: workoutDayDebugPayloadStartedAt(raw.payload),
            derivedDayKey,
            requestedUiRange: { start, end },
          });
          if (!rawKind || rawKind !== kind) {
            if (dbgTouch) {
              logWorkoutDayDebug("pipeline-row", { ...dbgRowBase(), outcome: "dropped_kind_mismatch" });
            }
            if (isTarget && debugHydrateLabel) {
              truthTrace.lastDropById.set(
                id,
                `kind_mismatch:listKind=${kind}:docKind=${rawKind ?? "missing"}`,
              );
              emitHydrateTargetPostListTrace({
                debugHydrateLabel,
                targetRawEventId: id,
                requestedUiStart: start,
                requestedUiEnd: end,
                listKindBeingHydrated: kind,
                raw,
                derivedDayKey,
                dropPoint: "kind_mismatch",
                parseInvoked: false,
                parsedItem: null,
                insertedIntoGrouped: false,
                groupedBucketDayKey: null,
              });
            }
            continue;
          }

          if (!derivedDayKey) {
            if (dbgTouch) {
              logWorkoutDayDebug("pipeline-row", { ...dbgRowBase(), outcome: "dropped_deriveWorkoutDayKey_null" });
            }
            if (isTarget && debugHydrateLabel) {
              truthTrace.lastDropById.set(id, "deriveWorkoutDayKey_null");
              emitHydrateTargetPostListTrace({
                debugHydrateLabel,
                targetRawEventId: id,
                requestedUiStart: start,
                requestedUiEnd: end,
                listKindBeingHydrated: kind,
                raw,
                derivedDayKey: null,
                dropPoint: "deriveWorkoutDayKey_null",
                parseInvoked: false,
                parsedItem: null,
                insertedIntoGrouped: false,
                groupedBucketDayKey: null,
              });
            }
            continue;
          }
          if (derivedDayKey < start || derivedDayKey > end) {
            if (dbgTouch) {
              logWorkoutDayDebug("pipeline-row", {
                ...dbgRowBase(),
                outcome: "dropped_dayKey_outside_ui_range",
              });
            }
            if (isTarget && debugHydrateLabel) {
              const reason = `dayKey_outside_ui_range:dayKey=${derivedDayKey}:uiStart=${start}:uiEnd=${end}`;
              truthTrace.lastDropById.set(id, reason);
              emitHydrateTargetPostListTrace({
                debugHydrateLabel,
                targetRawEventId: id,
                requestedUiStart: start,
                requestedUiEnd: end,
                listKindBeingHydrated: kind,
                raw,
                derivedDayKey,
                dropPoint: "dayKey_outside_ui_range",
                parseInvoked: false,
                parsedItem: null,
                insertedIntoGrouped: false,
                groupedBucketDayKey: null,
              });
            }
            continue;
          }

          const item = parseWorkoutHistoryItem(resJson as never);
          grouped.push({ day: derivedDayKey, workout: item });
          if (dbgTouch) {
            logWorkoutDayDebug("pipeline-row", {
              ...dbgRowBase(),
              outcome: "included_into_hydrate_bucket",
              parsedWorkoutId: item.id,
              parsedRawKind: item.rawKind ?? null,
              parsedTitle: item.title,
              strengthIngestExerciseCount: item.strengthIngestExercises?.length ?? 0,
            });
          }
          if (isTarget && debugHydrateLabel) {
            truthTrace.includedIds.add(id);
            truthTrace.lastDropById.delete(id);
            emitHydrateTargetPostListTrace({
              debugHydrateLabel,
              targetRawEventId: id,
              requestedUiStart: start,
              requestedUiEnd: end,
              listKindBeingHydrated: kind,
              raw,
              derivedDayKey,
              dropPoint: "included_into_grouped",
              parseInvoked: true,
              parsedItem: item,
              insertedIntoGrouped: true,
              groupedBucketDayKey: derivedDayKey,
            });
          }
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

  if (__DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel) {
    const countsBySourceId: Record<string, number> = {};
    for (const g of grouped) {
      const sid = String(g.workout.sourceId ?? "unknown").trim() || "unknown";
      countsBySourceId[sid] = (countsBySourceId[sid] ?? 0) + 1;
    }
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_PIPELINE_DEBUG] hydrate-raw-items-by-source", {
      debugHydrateLabel,
      uiRangeStart: start,
      uiRangeEnd: end,
      countsBySourceId,
      totalParsedItems: grouped.length,
    });
  }

  if (truthCfg && __DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel) {
    for (const tid of truthCfg.exactIds) {
      if (truthTrace.includedIds.has(tid)) continue;
      if (truthTrace.seenInListIds.has(tid)) continue;

      const probe = await getRawEvent(tid, idToken);
      if (probe == null || !probe.ok) {
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-probe", {
          debugHydrateLabel,
          id: tid,
          outcome: "get_failed",
          error: probe && !probe.ok ? probe.error : "no_response",
        });
        continue;
      }
      const doc = probe.json as WorkoutRawForDayDerivation & { kind?: string; sourceId?: string };
      const derived = deriveWorkoutDayKey(doc);
      const inPaddedWindow =
        typeof doc.observedAt === "string" &&
        observedAtLikelyInsideDayKeyWindow(doc.observedAt, observedStart, observedEnd);
      // eslint-disable-next-line no-console
      console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-probe", {
        debugHydrateLabel,
        id: tid,
        outcome: "not_seen_in_any_list_page",
        observedAt: doc.observedAt,
        kind: doc.kind ?? null,
        sourceId: doc.sourceId ?? null,
        payloadPreview: workoutTruthPayloadPreview(doc.payload),
        derivedDayKey: derived,
        uiRangeStart: start,
        uiRangeEnd: end,
        paddedListStartDay: observedStart,
        paddedListEndDay: observedEnd,
        observedAtLikelyInsidePaddedServerListWindow: inPaddedWindow,
        derivedDayVsUiRange:
          derived == null ? "derive_null" : derived < start ? "before_ui" : derived > end ? "after_ui" : "inside_ui",
      });
    }
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

  if (workoutDayDebugEnabled() && workoutDayDebugRangeOverlaps(start, end)) {
    for (const d of WORKOUT_DAY_DEBUG_DATES) {
      if (d < start || d > end) continue;
      const bucket = days.find((x) => x.day === d)?.workouts ?? [];
      const byKind: Record<string, string[]> = {};
      for (const w of bucket) {
        const key = w.rawKind ?? w.sourceId ?? "unknown";
        byKind[key] = byKind[key] ?? [];
        byKind[key].push(w.id);
      }
      logWorkoutDayDebug("hydrate-result-bucket", {
        day: d,
        workoutCount: bucket.length,
        workoutIds: bucket.map((w) => w.id),
        byKind,
      });
    }
  }

  if (__DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel) {
    let multiSourceSessionCount = 0;
    for (const d of days) {
      const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
      for (const s of sessions) {
        if (s.sourceCount > 1) multiSourceSessionCount += 1;
      }
    }
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_PIPELINE_DEBUG] hydrate-merged-sessions", {
      debugHydrateLabel,
      multiSourceSessionCount,
      dayBuckets: days.filter((d) => d.workouts.length > 0).length,
    });
  }

  if (truthCfg && __DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel) {
    const targetIdsToScan = new Set<string>();
    for (const tid of truthTrace.seenInListIds) {
      if (rawEventIdMatchesTruthTargets(tid, truthCfg)) targetIdsToScan.add(tid);
    }
    for (const tid of truthTrace.includedIds) {
      if (rawEventIdMatchesTruthTargets(tid, truthCfg)) targetIdsToScan.add(tid);
    }
    for (const tid of targetIdsToScan) {
      const finalDayKeys = days.filter((d) => d.workouts.some((w) => w.id === tid)).map((d) => d.day);
      // eslint-disable-next-line no-console
      console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-final-model-buckets", {
        debugHydrateLabel,
        targetRawEventId: tid,
        presentInFinalDaysArray: finalDayKeys.length > 0,
        finalDayKeys,
      });
    }
  }

  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    const nonEmpty = days.filter((d) => d.workouts.length > 0);
    const totalRawItems = nonEmpty.reduce((acc, d) => acc + d.workouts.length, 0);
    const totalSessions = nonEmpty.reduce(
      (acc, d) => acc + reconcileWorkoutSessionsForDay(d.day, d.workouts).length,
      0,
    );
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] range-coverage", {
      requestedStart: start,
      requestedEnd: end,
      observedStart,
      observedEnd,
      rawEventKindsHydrated: kinds,
      earliestStoredWorkoutDay: nonEmpty[0]?.day ?? null,
      latestStoredWorkoutDay: nonEmpty[nonEmpty.length - 1]?.day ?? null,
      daysWithWorkouts: nonEmpty.length,
      totalRawWorkoutItems: totalRawItems,
      totalReconciledSessions: totalSessions,
      totalRawEventListRowsFetched,
      debugHydrateLabel: debugHydrateLabel ?? null,
    });
  }

  if (truthCfg && __DEV__ && !process.env.JEST_WORKER_ID && debugHydrateLabel) {
    const reconciliationById: Record<
      string,
      { day: DayKey; sessionCountThatDay: number; sessionContainsWorkoutId: boolean }
    > = {};
    for (const tid of truthTrace.includedIds) {
      for (const d of days) {
        const w = d.workouts.find((x) => x.id === tid);
        if (!w) continue;
        const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
        reconciliationById[tid] = {
          day: d.day,
          sessionCountThatDay: sessions.length,
          sessionContainsWorkoutId: sessions.some((s) => s.workouts.some((rw) => rw.id === tid)),
        };
        break;
      }
    }
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-reconciliation", {
      debugHydrateLabel,
      reconciliationById,
    });
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] hydrate-target-outcome", {
      debugHydrateLabel,
      requestedUiStart: start,
      requestedUiEnd: end,
      paddedListStartDay: observedStart,
      paddedListEndDay: observedEnd,
      includedTargetIds: [...truthTrace.includedIds],
      droppedTargets: Object.fromEntries(truthTrace.lastDropById),
      seenInListNotIncluded: [...truthTrace.seenInListIds].filter((id) => !truthTrace.includedIds.has(id)),
      analyticsAvgSemanticsNote:
        debugHydrateLabel === "overview-analytics-2026" || debugHydrateLabel === "overview-shared"
          ? "Overview chart+stats use buildWorkoutOverviewAnalyticsFromCalendarDays (calendar 2026; metrics: active months/weeks, Avg Duration caps at 480m per session)."
          : undefined,
    });
  }

  if (overviewSharedHydrateWallStart != null) {
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_PERF] overview-shared-hydrate-complete", {
      requestedDayStart: start,
      requestedDayEnd: end,
      hydrateDurationMs: Date.now() - overviewSharedHydrateWallStart,
      totalRawEventListRowsFetched,
      totalRawEventDocFetches,
    });
  }

  const durableTitlesByWorkoutId = await hydrateDurableTitleOverrideMap(observedStart, observedEnd, idToken);
  return { ok: true, days, durableTitlesByWorkoutId };
}

export function useWorkoutsCalendarRange(
  start: DayKey,
  end: DayKey,
  options?: WorkoutCalendarAdapterOptions,
): WorkoutCalendarRangeState {
  const { user, initializing, getIdToken } = useAuth();
  const [state, setState] = useState<WorkoutCalendarRangeState>({ status: "partial" });
  const [hydrateInvalidateTick, setHydrateInvalidateTick] = useState(0);
  const seqRef = useRef(0);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    return subscribeWorkoutCalendarHydrateInvalidate(() => {
      setHydrateInvalidateTick((n) => n + 1);
    });
  }, []);

  const optsRef = useRef<WorkoutCalendarAdapterOptions | undefined>(options);
  optsRef.current = options;

  const rawKindsSig = JSON.stringify(resolveWorkoutCalendarRawEventKinds(options));

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

    const kinds = resolveWorkoutCalendarRawEventKinds(optsRef.current);
    const kindsSig = kinds.join(",");
    const shapeKey = rangeShapeKey(uid, start, end, kindsSig);
    const staleEntry = lastGoodRangeByShape.get(shapeKey);

    const token = await getIdToken(false);
    if (!token || seq !== seqRef.current) return;

    if (staleEntry) {
      safeSet({
        status: "ready",
        days: staleEntry.days,
        ...(staleEntry.markerFlagsByDay
          ? { markerFlagsByDay: staleEntry.markerFlagsByDay }
          : {}),
        durableTitlesByWorkoutId: staleEntry.durableTitlesByWorkoutId ?? {},
        refreshing: true,
      });
    } else {
      safeSet({ status: "partial" });
    }

    const preferSummary = Boolean(optsRef.current?.preferWorkoutDaySummaries);
    const summaryRangeDays = enumerateDaysInclusive(start, end).length;
    if (preferSummary && summaryRangeDays <= WORKOUT_DAY_SUMMARY_CLIENT_MAX_RANGE_DAYS) {
      let sumRes = await getWorkoutDaySummaries(token, { start, end });
      if (seq !== seqRef.current) return;

      const buildFromSummaryResponse = (): CachedWorkoutCalendarRange | null => {
        if (!sumRes.ok) return null;
        if (!sumRes.json.complete || sumRes.json.items.length !== sumRes.json.expectedDayCount) return null;
        let versionsOk = true;
        const markerFlagsByDay: Record<DayKey, WorkoutMarkerFlags> = {};
        for (const it of sumRes.json.items) {
          if (
            it.schemaVersion !== WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion ||
            it.reconcileVersion !== WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion
          ) {
            versionsOk = false;
            break;
          }
          if (it.rawWorkoutCount > 0 || it.hasStrength || it.hasCardio) {
            markerFlagsByDay[it.day] = {
              hasStrength: it.hasStrength,
              hasCardio: it.hasCardio,
            };
          }
        }
        if (!versionsOk) return null;
        const days = enumerateDaysInclusive(start, end).map((day) => ({
          day,
          workouts: [] as WorkoutHistoryItem[],
        }));
        return { days, markerFlagsByDay, durableTitlesByWorkoutId: {} };
      };

      let cached = buildFromSummaryResponse();

      if (
        !cached &&
        sumRes.ok &&
        !sumRes.json.complete &&
        summaryRangeDays <= WORKOUT_DAY_SUMMARY_REBUILD_MAX_DAYS
      ) {
        if (__DEV__ && !process.env.JEST_WORKER_ID && optsRef.current?.debugHydrateLabel === "calendar-viewport") {
          // eslint-disable-next-line no-console
          console.log("[WORKOUT_PERF] calendar-summary-miss", {
            start,
            end,
            reason: "incomplete_before_rebuild",
          });
        }
        const rebuildRes = await postWorkoutDaySummariesRebuild(token, { start, end });
        if (seq !== seqRef.current) return;
        if (rebuildRes.ok) {
          if (__DEV__ && !process.env.JEST_WORKER_ID && optsRef.current?.debugHydrateLabel === "calendar-viewport") {
            // eslint-disable-next-line no-console
            console.log("[WORKOUT_PERF] calendar-summary-rebuild-done", {
              start,
              end,
              daysProcessed: rebuildRes.json.daysProcessed,
            });
          }
          sumRes = await getWorkoutDaySummaries(token, { start, end });
          if (seq !== seqRef.current) return;
          cached = buildFromSummaryResponse();
        }
      }

      if (cached) {
        const observedPad = observedAtPadDaysForWorkoutCalendarRange(start, end);
        const titleObsStart = addCalendarDaysToDayKey(start, -observedPad);
        const titleObsEnd = addCalendarDaysToDayKey(end, observedPad);
        const durableTitlesByWorkoutId = await hydrateDurableTitleOverrideMap(
          titleObsStart,
          titleObsEnd,
          token,
        );
        if (seq !== seqRef.current) return;
        const cachedWithTitles: CachedWorkoutCalendarRange = { ...cached, durableTitlesByWorkoutId };
        lastGoodRangeByShape.set(shapeKey, cachedWithTitles);
        if (__DEV__ && !process.env.JEST_WORKER_ID && optsRef.current?.debugHydrateLabel === "calendar-viewport") {
          // eslint-disable-next-line no-console
          console.log("[WORKOUT_PERF] calendar-summary-hit", {
            start,
            end,
            markedDays: Object.keys(cached.markerFlagsByDay ?? {}).length,
          });
        }
        safeSet({
          status: "ready",
          days: cached.days,
          ...(cached.markerFlagsByDay ? { markerFlagsByDay: cached.markerFlagsByDay } : {}),
          durableTitlesByWorkoutId,
          refreshing: false,
        });
        return;
      }

      if (__DEV__ && !process.env.JEST_WORKER_ID && optsRef.current?.debugHydrateLabel === "calendar-viewport") {
        const reason = !sumRes.ok
          ? "http_error"
          : !sumRes.json.complete
            ? "incomplete_after_rebuild"
            : "version_or_shape_mismatch";
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_PERF] calendar-summary-raw-fallback", { start, end, reason });
      }
    }

    if (
      workoutDayDebugEnabled() &&
      start === end &&
      isWorkoutDayDebugDate(start)
    ) {
      logWorkoutDayDebug("day-detail-pre-hydrate", {
        requestedDay: start,
        perDayCacheWorkoutIdsBeforeHydrate: getCachedWorkoutsForDay(uid, start).map((w) => w.id),
        rangeShapeKey: shapeKey,
        ...workoutDayDebugFixRevision(),
      });
    }

    const res = await hydrateWorkoutsForRange(
      kinds,
      start,
      end,
      token,
      optsRef.current?.debugHydrateLabel,
    );
    if (seq !== seqRef.current) return;

    if (!res.ok) {
      if (staleEntry) {
        safeSet({
          status: "ready",
          days: staleEntry.days,
          ...(staleEntry.markerFlagsByDay
            ? { markerFlagsByDay: staleEntry.markerFlagsByDay }
            : {}),
          durableTitlesByWorkoutId: staleEntry.durableTitlesByWorkoutId ?? {},
          refreshing: false,
        });
      } else {
        safeSet({
          status: "error",
          error: res.error,
          requestId: res.requestId,
        });
      }
      return;
    }

    lastGoodRangeByShape.set(shapeKey, {
      days: res.days,
      durableTitlesByWorkoutId: res.durableTitlesByWorkoutId,
    });
    mergeWorkoutsIntoDayCache(uid, res.days);
    safeSet({
      status: "ready",
      days: res.days,
      durableTitlesByWorkoutId: res.durableTitlesByWorkoutId,
      refreshing: false,
    });
  }, [
    start,
    end,
    initializing,
    user,
    getIdToken,
    options?.refreshEpoch,
    rawKindsSig,
    options?.preferWorkoutDaySummaries,
    hydrateInvalidateTick,
  ]);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, start, end, user?.uid, options?.refreshEpoch, rawKindsSig, hydrateInvalidateTick]);

  return state;
}

/**
 * Day detail: single-day GET /raw-events uses `observedAt` bounds; overview hydrate may have
 * already bucketed the same raw ids under this day (wider window). Union so we do not drop rows
 * when `observedAt` is far from the workout's logical day. Range result wins on id collision.
 */
function mergeWorkoutDayDetailWorkouts(fromCache: WorkoutHistoryItem[], fromRange: WorkoutHistoryItem[]): WorkoutHistoryItem[] {
  const byId = new Map<string, WorkoutHistoryItem>();
  for (const w of fromCache) byId.set(w.id, w);
  for (const w of fromRange) byId.set(w.id, w);
  return sortWorkoutsChronologicalAsc([...byId.values()]);
}

export type WorkoutDayDetailState =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | {
      status: "ready";
      day: DayKey;
      workouts: WorkoutHistoryItem[];
      dailyFacts?: DailyFactsDto;
      durableTitlesByWorkoutId: Record<string, string>;
    };

export function useWorkoutDayDetail(
  day: DayKey,
  options?: WorkoutCalendarAdapterOptions,
): WorkoutDayDetailState {
  const { user } = useAuth();
  const rangeState = useWorkoutsCalendarRange(day, day, options);
  const dailyFacts = useDailyFacts(day);

  const uid = user?.uid ?? "";

  const rangeSettled = rangeState.status === "ready";
  const fromRange = rangeSettled
    ? sortWorkoutsChronologicalAsc(rangeState.days[0]?.workouts ?? [])
    : [];
  const fromCache = uid ? getCachedWorkoutsForDay(uid, day) : [];
  const workouts = rangeSettled
    ? mergeWorkoutDayDetailWorkouts(fromCache, fromRange)
    : fromCache.length > 0
      ? sortWorkoutsChronologicalAsc(fromCache)
      : [];

  const workoutDayDebugSig = `${fromCache.map((w) => w.id).join(",")}|${fromRange.map((w) => w.id).join(",")}|${workouts.map((w) => w.id).join(",")}`;
  useEffect(() => {
    if (!workoutDayDebugEnabled() || !isWorkoutDayDebugDate(day) || !uid) return;
    logWorkoutDayDebug("day-detail-hook", {
      requestedDay: day,
      rangeStatus: rangeState.status,
      fromCacheWorkoutIds: fromCache.map((w) => w.id),
      fromRangeWorkoutIds: fromRange.map((w) => w.id),
      mergedWorkoutIds: workouts.map((w) => w.id),
      observedAtPadDaysForThisRange: observedAtPadDaysForWorkoutCalendarRange(day, day),
      ...workoutDayDebugFixRevision(),
    });
  }, [day, uid, rangeState.status, workoutDayDebugSig]);

  if (rangeState.status === "error") {
    return {
      status: "error",
      error: rangeState.error,
      requestId: rangeState.requestId,
    };
  }

  if (!rangeSettled && workouts.length === 0) {
    return { status: "partial" };
  }

  const dailyFactsDto =
    dailyFacts.status === "ready" && dailyFacts.data ? dailyFacts.data : undefined;

  const durableTitlesByWorkoutId =
    rangeState.status === "ready" ? rangeState.durableTitlesByWorkoutId : {};

  return {
    status: "ready",
    day,
    workouts,
    durableTitlesByWorkoutId,
    ...(dailyFactsDto ? { dailyFacts: dailyFactsDto } : {}),
  };
}
