// lib/data/useWeightSeries.ts
// Read-only weight series from raw events. Deterministic VM; no client writes.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvents, getRawEvent } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";

/** Per-page limit for getRawEvents (API max 100). */
const MAX_WEIGHT_ITEMS_FETCH = 100;
/** Hard cap for all-time fetch; if exceeded, fail-closed with explicit error. */
const MAX_TOTAL_WEIGHT_ITEMS = 5000;
const CONCURRENCY = 8;

function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

function parseYmd(dayKey: string): number {
  const parts = dayKey.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d).getTime();
}

function addDays(dayKey: string, delta: number): string {
  const d = new Date(parseYmd(dayKey));
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export type WeightRangeKey = "7D" | "30D" | "90D" | "6M" | "1Y" | "3Y" | "5Y" | "All";

/** One weight entry; observedAt must come from raw event (no derived/fake timestamps). */
export type WeightPoint = {
  /** ISO timestamp from raw event observedAt; required for chart X-axis and ordering. */
  observedAt: string;
  dayKey: string;
  weightKg: number;
  sourceId: string;
};

export type WeightSeriesViewModel = {
  points: WeightPoint[];
  latest: { weightKg: number; observedAt: string; sourceId: string } | null;
  avg7Kg: number | null;
  weeklyDeltaKg: number | null;
  rolling7: { dayKey: string; valueKg: number }[];
  insights: {
    change30dKg: number | null;
    weeklyRateKg: number | null;
    consistency: "low" | "medium" | "high";
    volatilityKg: number | null;
    streakDays: number;
    trendNote: string;
  };
};

function computeRolling7(
  points: WeightPoint[],
): { dayKey: string; valueKg: number }[] {
  if (points.length === 0) return [];
  const byDay = new Map<string, number[]>();
  for (const p of points) {
    const d = p.dayKey;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(p.weightKg);
  }
  const dayKeys = Array.from(byDay.keys()).sort();
  const result: { dayKey: string; valueKg: number }[] = [];
  for (const dayKey of dayKeys) {
    const vals: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(dayKey, -i);
      const dayVals = byDay.get(d);
      if (dayVals) vals.push(...dayVals);
    }
    if (vals.length > 0) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      result.push({ dayKey, valueKg: mean });
    }
  }
  result.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  return result;
}

function computeInsights(
  points: WeightPoint[],
  latest: { weightKg: number; observedAt: string } | null,
  timeZone: string,
): WeightSeriesViewModel["insights"] {
  const dayKeys = [...new Set(points.map((p) => p.dayKey))].sort();
  const byDay = new Map<string, number[]>();
  for (const p of points) {
    if (!byDay.has(p.dayKey)) byDay.set(p.dayKey, []);
    byDay.get(p.dayKey)!.push(p.weightKg);
  }
  const dayMeans = dayKeys.map((d) => {
    const v = byDay.get(d)!;
    return { dayKey: d, mean: v.reduce((a, b) => a + b, 0) / v.length };
  });

  let change30dKg: number | null = null;
  if (dayMeans.length >= 2) {
    const recent = dayMeans.slice(-30);
    if (recent.length >= 2) {
      change30dKg = recent[recent.length - 1]!.mean - recent[0]!.mean;
    }
  }

  let weeklyRateKg: number | null = null;
  if (latest && dayMeans.length >= 2) {
    const latestDay = ymdInTimeZoneFromIso(latest.observedAt, timeZone);
    const idx = dayMeans.findIndex((m) => m.dayKey === latestDay);
    if (idx >= 7) {
      const weekAgo = dayMeans[idx - 7];
      if (weekAgo) weeklyRateKg = latest.weightKg - weekAgo.mean;
    }
  }

  let volatilityKg: number | null = null;
  if (dayMeans.length >= 2) {
    const vals = dayMeans.map((m) => m.mean);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length;
    volatilityKg = Math.sqrt(variance);
  }

  const consistency: "low" | "medium" | "high" =
    volatilityKg == null
      ? "medium"
      : volatilityKg < 0.3
        ? "low"
        : volatilityKg > 0.8
          ? "high"
          : "medium";

  let streakDays = 0;
  const today = getTodayDayKey();
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    if (byDay.has(d)) streakDays++;
    else break;
  }

  let trendNote = "Not enough data";
  if (change30dKg != null && dayMeans.length >= 7) {
    if (change30dKg < -0.5) trendNote = "Down over 30 days";
    else if (change30dKg > 0.5) trendNote = "Up over 30 days";
    else trendNote = "Stable over 30 days";
  }

  return {
    change30dKg,
    weeklyRateKg,
    consistency,
    volatilityKg,
    streakDays,
    trendNote,
  };
}

function buildViewModel(
  points: WeightPoint[],
  timeZone: string,
): WeightSeriesViewModel {
  const sorted = [...points].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
  );
  const latest =
    sorted.length > 0
      ? {
          weightKg: sorted[sorted.length - 1]!.weightKg,
          observedAt: sorted[sorted.length - 1]!.observedAt,
          sourceId: sorted[sorted.length - 1]!.sourceId,
        }
      : null;

  const dayKeys = [...new Set(sorted.map((p) => p.dayKey))].sort();
  let avg7Kg: number | null = null;
  if (dayKeys.length > 0) {
    const last7 = dayKeys.slice(-7);
    const vals = last7.flatMap((d) =>
      sorted.filter((p) => p.dayKey === d).map((p) => p.weightKg),
    );
    if (vals.length > 0)
      avg7Kg = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  let weeklyDeltaKg: number | null = null;
  if (latest && sorted.length >= 2) {
    const latestDay = ymdInTimeZoneFromIso(latest.observedAt, timeZone);
    const targetDay = addDays(latestDay, -7);
    const near = sorted.filter((p) => p.dayKey <= targetDay);
    if (near.length > 0) {
      const ref = near[near.length - 1]!;
      weeklyDeltaKg = latest.weightKg - ref.weightKg;
    }
  }

  const rolling7 = computeRolling7(sorted);
  const insights = computeInsights(sorted, latest, timeZone);

  return {
    points: sorted,
    latest,
    avg7Kg,
    weeklyDeltaKg,
    rolling7,
    insights,
  };
}

/**
 * Returns start/end dayKeys for bounded ranges. For "All", callers must use
 * all-time fetch (pagination without start/end), not this.
 */
function rangeToStartEnd(
  range: WeightRangeKey,
): { start: string; end: string } | "all" {
  if (range === "All") return "all";
  const today = getTodayDayKey();
  const end = today;
  let start: string;
  switch (range) {
    case "7D":
      start = addDays(today, -7);
      break;
    case "30D":
      start = addDays(today, -30);
      break;
    case "90D":
      start = addDays(today, -90);
      break;
    case "6M":
      start = addDays(today, -182);
      break;
    case "1Y":
      start = addDays(today, -365);
      break;
    case "3Y":
      start = addDays(today, -1095);
      break;
    case "5Y":
      start = addDays(today, -1825);
      break;
    default:
      start = addDays(today, -30);
  }
  return { start, end };
}

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; data: WeightSeriesViewModel };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useWeightSeries(range: WeightRangeKey): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }

      safeSet({ status: "partial" });
      const rangeNow = rangeRef.current;
      const optsUnique = withUniqueCacheBust(opts, seq);
      const tz = getDeviceTimeZone();

      let items: { id: string; observedAt: string; sourceId: string }[];
      let lastRequestId: string | null = null;

      if (rangeToStartEnd(rangeNow) === "all") {
        // All-time: paginate without start/end until exhaustion or safety cap.
        const accumulated: { id: string; observedAt: string; sourceId: string }[] = [];
        let cursor: string | null = null;
        let done = false;
        while (!done) {
          if (seq !== reqSeq.current) return;
          const listRes = await getRawEvents(token, {
            kinds: ["weight"],
            limit: MAX_WEIGHT_ITEMS_FETCH,
            ...(cursor ? { cursor } : {}),
            ...optsUnique,
          });
          if (seq !== reqSeq.current) return;
          lastRequestId = listRes.requestId ?? null;
          const listOutcome = truthOutcomeFromApiResult(listRes);
          if (listOutcome.status !== "ready") {
            if (listOutcome.status === "missing") {
              done = true;
              break;
            }
            safeSet({
              status: "error",
              error: listOutcome.error,
              requestId: listOutcome.requestId,
              reason: listOutcome.reason,
            });
            return;
          }
          const page = listOutcome.data.items;
          for (const it of page) {
            accumulated.push({
              id: it.id,
              observedAt: it.observedAt,
              sourceId: it.sourceId,
            });
          }
          if (accumulated.length >= MAX_TOTAL_WEIGHT_ITEMS && listOutcome.data.nextCursor) {
            safeSet({
              status: "error",
              error: `Weight history exceeds ${MAX_TOTAL_WEIGHT_ITEMS} entries. All-time view is limited; please use a shorter range.`,
              requestId: lastRequestId,
              reason: "contract",
            });
            return;
          }
          cursor = listOutcome.data.nextCursor;
          done = cursor == null;
        }
        items = accumulated;
      } else {
        const { start, end } = rangeToStartEnd(rangeNow) as { start: string; end: string };
        const listRes = await getRawEvents(token, {
          start,
          end,
          kinds: ["weight"],
          limit: MAX_WEIGHT_ITEMS_FETCH,
          ...optsUnique,
        });
        if (seq !== reqSeq.current) return;
        lastRequestId = listRes.requestId ?? null;
        const listOutcome = truthOutcomeFromApiResult(listRes);
        if (listOutcome.status !== "ready") {
          if (listOutcome.status === "missing") {
            safeSet({
              status: "ready",
              data: buildViewModel([], tz),
            });
            return;
          }
          safeSet({
            status: "error",
            error: listOutcome.error,
            requestId: listOutcome.requestId,
            reason: listOutcome.reason,
          });
          return;
        }
        items = listOutcome.data.items;
      }

      if (seq !== reqSeq.current) return;
      const points: WeightPoint[] = [];

      for (let i = 0; i < items.length; i += CONCURRENCY) {
        const batch = items.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map((item) => getRawEvent(item.id, token, optsUnique)),
        );
        if (seq !== reqSeq.current) return;
        for (let j = 0; j < results.length; j++) {
          const res = results[j]!;
          const raw = items[i + j]!;
          if (!res.ok) {
            safeSet({
              status: "error",
              error: res.error,
              requestId: res.requestId,
              reason: res.kind,
            });
            return;
          }
          const doc = res.json;
          if (doc.kind !== "weight") continue;
          const payload = doc.payload as { weightKg?: number; time?: string };
          const weightKg = typeof payload?.weightKg === "number" && payload.weightKg > 0 ? payload.weightKg : null;
          if (weightKg == null) continue;
          // Fail-closed: observedAt must come from raw event; do not derive fake timestamps.
          const observedAt = raw.observedAt;
          if (typeof observedAt !== "string" || observedAt.length === 0) {
            if (__DEV__) {
              console.warn("useWeightSeries: skipped raw event missing observedAt");
            }
            continue;
          }
          const dayKey = ymdInTimeZoneFromIso(observedAt, tz);
          points.push({
            observedAt,
            dayKey,
            weightKg,
            sourceId: raw.sourceId,
          });
        }
      }

      const viewModel = buildViewModel(points, tz);
      safeSet({ status: "ready", data: viewModel });
    },
    [getIdToken, initializing, user, range],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, range, user?.uid]);

  return { ...state, refetch: fetchOnce };
}
