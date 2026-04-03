import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvent, getRawEvents } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";
import { filterToAppleHealthBodyReadSources, isAppleHealthBodyReadSourceId } from "@/lib/data/body/sourceFiltering";
import {
  resolveBodyHistoryQueryWindow,
  type WeightRangeKey,
} from "@/lib/data/body/bodyHistoryRange";

const MAX_FETCH = 100;
/** Safety cap for rows within a bounded `start`/`end` window (multi-metric × backfill). */
const MAX_TOTAL_BOUNDED = 25000;
const CONCURRENCY = 8;

export type BodyTrendMetric =
  | "weight"
  | "body_fat_percent"
  | "bmi"
  | "lean_body_mass"
  | "resting_metabolic_rate";

/** Raw-event kinds needed for a single metric (smaller list responses on detail screens). */
export function trendKindsForMetric(metric: BodyTrendMetric): ("weight" | "body_composition")[] {
  return metric === "weight" ? ["weight"] : ["body_composition"];
}

export type BodyMetricStats = {
  change: number | null;
  avg: number | null;
  high: number | null;
  low: number | null;
};

type Ready = {
  status: "ready";
  data: {
    byMetric: Record<BodyTrendMetric, WeightPoint[]>;
    statsByMetric: Record<BodyTrendMetric, BodyMetricStats>;
  };
};

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | Ready;

/** Exposed for Body permission UX (derive phase from trends readiness + point counts). */
export type BodyMetricTrendsState = State;

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

function buildStats(points: WeightPoint[]): BodyMetricStats {
  if (points.length === 0) return { change: null, avg: null, high: null, low: null };
  const sorted = [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const values = sorted.map((p) => p.weightKg);
  const avg = values.reduce((s, n) => s + n, 0) / values.length;
  return {
    change: values.length >= 2 ? values[values.length - 1]! - values[0]! : null,
    avg,
    high: Math.max(...values),
    low: Math.min(...values),
  };
}

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

function emptyReady(): Ready {
  return {
    status: "ready",
    data: {
      byMetric: {
        weight: [],
        body_fat_percent: [],
        bmi: [],
        lean_body_mass: [],
        resting_metabolic_rate: [],
      },
      statsByMetric: {
        weight: { change: null, avg: null, high: null, low: null },
        body_fat_percent: { change: null, avg: null, high: null, low: null },
        bmi: { change: null, avg: null, high: null, low: null },
        lean_body_mass: { change: null, avg: null, high: null, low: null },
        resting_metabolic_rate: { change: null, avg: null, high: null, low: null },
      },
    },
  };
}

type TrendRow = {
  id: string;
  observedAt: string;
  sourceId: string;
  kind: string;
  payload?: unknown;
};

/**
 * Body chart trends: always queries a **bounded** `observedAt` window derived from `chartRange`
 * (maps "All" → 5Y). Apple Health source filter + optional list `includePayload` avoids unbounded scans
 * and N+1 GETs when the API embeds payload.
 *
 * @param filterMetric — when set, only that metric is populated (and only the matching raw `kind(s)` are requested).
 * @param opts.enabled — when false, skips network (e.g. invalid route guard).
 */
export function useBodyMetricTrends(
  chartRange: WeightRangeKey,
  filterMetric?: BodyTrendMetric,
  opts?: { enabled?: boolean },
): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const rangeRef = useRef(chartRange);
  rangeRef.current = chartRange;
  const metricRef = useRef(filterMetric);
  metricRef.current = filterMetric;
  const enabledRef = useRef(opts?.enabled !== false);
  enabledRef.current = opts?.enabled !== false;
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };
      if (!enabledRef.current) {
        safeSet(emptyReady());
        return;
      }
      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }
      const token = await getIdToken(false);
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }
      safeSet({ status: "partial" });
      const optsUnique = withUniqueCacheBust(opts, seq);
      const tz = getDeviceTimezone();
      const { start, end } = resolveBodyHistoryQueryWindow(rangeRef.current);
      const fm = metricRef.current;
      const kinds = fm ? trendKindsForMetric(fm) : (["weight", "body_composition"] as const);

      const accumulated: TrendRow[] = [];
      let cursor: string | null = null;
      let lastRequestId: string | null = null;

      for (;;) {
        if (seq !== reqSeq.current) return;
        const listRes = await getRawEvents(token, {
          start,
          end,
          kinds: [...kinds],
          limit: MAX_FETCH,
          includePayload: true,
          ...(cursor ? { cursor } : {}),
          ...optsUnique,
        });
        if (seq !== reqSeq.current) return;
        lastRequestId = listRes.requestId ?? null;
        const outcome = truthOutcomeFromApiResult(listRes);
        if (outcome.status !== "ready") {
          if (outcome.status === "missing") break;
          safeSet({
            status: "error",
            error: outcome.error,
            requestId: outcome.requestId,
            reason: outcome.reason,
          });
          return;
        }
        for (const it of outcome.data.items) {
          const row: TrendRow = {
            id: it.id,
            observedAt: it.observedAt,
            sourceId: it.sourceId,
            kind: it.kind,
          };
          if (it.payload !== undefined) row.payload = it.payload;
          accumulated.push(row);
        }
        if (accumulated.length >= MAX_TOTAL_BOUNDED && outcome.data.nextCursor) {
          safeSet({
            status: "error",
            error: `Body history exceeds ${MAX_TOTAL_BOUNDED} entries in this range. Choose a shorter chart range.`,
            requestId: lastRequestId,
            reason: "contract",
          });
          return;
        }
        cursor = outcome.data.nextCursor;
        if (!cursor) break;
      }

      const rows = filterToAppleHealthBodyReadSources(accumulated);

      if (rows.length === 0) {
        safeSet(emptyReady());
        return;
      }

      const byMetric: Record<BodyTrendMetric, WeightPoint[]> = {
        weight: [],
        body_fat_percent: [],
        bmi: [],
        lean_body_mass: [],
        resting_metabolic_rate: [],
      };

      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const batch = rows.slice(i, i + CONCURRENCY);
        const hydrated = await Promise.all(
          batch.map(async (row) => {
            if (row.payload !== undefined) return { ok: true as const, row };
            const res = await getRawEvent(row.id, token, optsUnique);
            if (!res.ok) return { ok: false as const, res };
            const doc = res.json;
            return {
              ok: true as const,
              row: {
                ...row,
                kind: doc.kind,
                payload: doc.payload,
              },
            };
          }),
        );
        if (seq !== reqSeq.current) return;
        for (const h of hydrated) {
          if (!h.ok) {
            safeSet({ status: "error", error: h.res.error, requestId: h.res.requestId, reason: h.res.kind });
            return;
          }
          const doc = h.row;
          if (doc.kind !== "weight" && doc.kind !== "body_composition") continue;
          const payload = doc.payload as {
            time?: string;
            timezone?: string;
            weightKg?: number;
            bodyFatPercent?: number;
            bmi?: number;
            leanBodyMassKg?: number;
            restingMetabolicRateKcal?: number;
          };
          const dayKey = deriveWeightPointDayKey(payload, doc.observedAt, tz);
          const push = (metric: BodyTrendMetric, value: number) => {
            byMetric[metric].push({
              observedAt: doc.observedAt,
              dayKey,
              weightKg: value,
              sourceId: doc.sourceId,
            });
          };
          const only = metricRef.current;
          if (doc.kind === "weight") {
            if (only && only !== "weight") continue;
            if (typeof payload.weightKg === "number" && payload.weightKg > 0) push("weight", payload.weightKg);
          } else {
            if (only === "weight") continue;
            if (!only || only === "body_fat_percent") {
              if (typeof payload.bodyFatPercent === "number" && payload.bodyFatPercent >= 0 && payload.bodyFatPercent <= 100)
                push("body_fat_percent", payload.bodyFatPercent);
            }
            if (!only || only === "bmi") {
              if (typeof payload.bmi === "number" && payload.bmi > 0 && payload.bmi < 100) push("bmi", payload.bmi);
            }
            if (!only || only === "lean_body_mass") {
              if (typeof payload.leanBodyMassKg === "number" && payload.leanBodyMassKg > 0)
                push("lean_body_mass", payload.leanBodyMassKg);
            }
            if (!only || only === "resting_metabolic_rate") {
              if (typeof payload.restingMetabolicRateKcal === "number" && payload.restingMetabolicRateKcal > 0)
                push("resting_metabolic_rate", payload.restingMetabolicRateKcal);
            }
          }
        }
      }

      (Object.keys(byMetric) as BodyTrendMetric[]).forEach((metric) => {
        byMetric[metric] = byMetric[metric]
          .filter((point) => isAppleHealthBodyReadSourceId(point.sourceId))
          .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
      });
      const statsByMetric = {
        weight: buildStats(byMetric.weight),
        body_fat_percent: buildStats(byMetric.body_fat_percent),
        bmi: buildStats(byMetric.bmi),
        lean_body_mass: buildStats(byMetric.lean_body_mass),
        resting_metabolic_rate: buildStats(byMetric.resting_metabolic_rate),
      };
      safeSet({ status: "ready", data: { byMetric, statsByMetric } });
    },
    [getIdToken, initializing, user, chartRange, filterMetric, opts?.enabled],
  );

  useEffect(() => {
    void loadOnce();
  }, [loadOnce, chartRange, filterMetric, opts?.enabled, user?.uid]);

  return useMemo(() => ({ ...state, refetch: loadOnce }), [state, loadOnce]);
}
