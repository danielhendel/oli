/**
 * DEV-ONLY — Integration probe: Apple Health workouts.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, TextInput } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvents } from "@/lib/api/usersMe";
import { getLastSyncAt } from "@/lib/integrations/appleHealth/storage";
import { getWorkoutsAnchor, setWorkoutsAnchor } from "@/lib/integrations/appleHealth/anchor";
import { runAnchoredWorkoutsSync } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import {
  pullAnchoredWorkouts,
  pullTodaySnapshot,
  pullWorkoutsByDateRange,
  getLocalCalendarDayBoundsFromYmd,
  addLocalCalendarDaysToDayKey,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  getStepCountForDateRange,
  diagnoseStepCountForWindow,
  runAppleHealthWorkoutPhysiologyDiagnostic,
  runAppleHealthWorkoutPhysiologyEnrichment,
  runRecentWorkoutRepair,
  type DiagnoseStepWindowResult,
  type RecentWorkoutRepairResult,
} from "@/lib/integrations/appleHealth";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import {
  getAppleHealthWorkoutsRecentRepairLastRunAt,
  setAppleHealthWorkoutsRecentRepairLastRunAt,
} from "@/lib/integrations/appleHealth/storage";
import type { TodayWorkout } from "@/lib/integrations/appleHealth/types";
import { ingestRawEvent } from "@/lib/api/ingest";
import {
  devProbeRecentManualStrengthWorkouts,
  type ManualStrengthProbeRow,
} from "@/lib/debug/manualStrengthDurability";
import {
  devProbeRecentWorkoutTitleOverrides,
  type WorkoutTitleOverrideProbeRow,
} from "@/lib/debug/workoutTitleOverrideDurability";
import {
  buildBatchHistoricalRepairJsonString,
  buildHistoricalRepairJsonString,
  filterHistoricalAppleWorkoutsForRepair,
  isValidYmd,
  parseHistoricalRepairDaysInput,
} from "@/lib/debug/historicalStepRepairProbe";

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function getTodayBounds(): { start: string; end: string; day: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  const day = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { start: start.toISOString(), end: end.toISOString(), day };
}

/**
 * Build the JSON payload consumed by `scripts/admin/repair-apple-health-workout-steps.mjs`.
 *
 * Pure: takes the diagnostic probe items + uid + day and emits the exact wire shape.
 * Each workout's rawEventId is derived from `workoutIdempotencyKey({...})` to match
 * `users/{uid}/rawEvents/{rawEventId}` and the canonical doc id (mirroring
 * `runAnchoredWorkoutsSync`).
 */
function buildRepairJsonForStepEnrichProbe(input: {
  uid: string;
  day: string;
  items: {
    start: string;
    end: string;
    activityId: number;
    sourceId?: string | null;
    productionGetStepCountForDateRange: number | null;
  }[];
}): string {
  const measurements = input.items.map((it) => ({
    rawEventId: workoutIdempotencyKey({
      startIso: it.start,
      endIso: it.end,
      activityId: it.activityId,
      sourceId: it.sourceId ?? null,
    }),
    steps: it.productionGetStepCountForDateRange,
  }));
  return JSON.stringify({ uid: input.uid, day: input.day, measurements }, null, 2);
}

export default function DebugIntegrationsScreen() {
  const { user, getIdToken } = useAuth();
  const [appleLastSyncAt, setAppleLastSyncAt] = useState<string | null>(null);
  const [appleAnchor, setAppleAnchor] = useState<string | null>(null);
  const [appleSyncResult, setAppleSyncResult] = useState<{
    ok: boolean;
    error?: string;
    requestId?: string | null;
    mayHaveMoreWorkouts?: boolean;
  } | null>(null);
  const [appleRawWorkouts, setAppleRawWorkouts] = useState<{
    count: number;
    items: { id: string; observedAt: string; sourceId: string; receivedAt?: string }[];
    requestId?: string | null;
    error?: string;
  } | null>(null);
  const [appleLastSyncAtAfter, setAppleLastSyncAtAfter] = useState<string | null>(null);
  const [recentRepairResult, setRecentRepairResult] = useState<
    | { ok: true; result: RecentWorkoutRepairResult }
    | { ok: false; error: string }
    | null
  >(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [manualStrengthProbe, setManualStrengthProbe] = useState<
    | { ok: true; rows: ManualStrengthProbeRow[] }
    | { ok: false; error: string }
    | null
  >(null);
  const [titleOverrideProbe, setTitleOverrideProbe] = useState<
    | { ok: true; rows: WorkoutTitleOverrideProbeRow[] }
    | { ok: false; error: string }
    | null
  >(null);
  const [stepEnrichProbe, setStepEnrichProbe] = useState<
    | {
        ok: true;
        day: string;
        items: {
          start: string;
          end: string;
          activityName: string;
          activityId: number;
          sourceId: string | null;
          diagnose: DiagnoseStepWindowResult;
          productionGetStepCountForDateRange: number | null;
        }[];
      }
    | { ok: false; error: string }
    | null
  >(null);
  const [historicalDayInput, setHistoricalDayInput] = useState<string>("");
  type HistoricalProbeItem = {
    start: string;
    end: string;
    activityName: string;
    activityId: number;
    sourceId: string | null;
    measuredSteps: number | null;
    probeError: string | null;
  };
  const [historicalProbe, setHistoricalProbe] = useState<
    | { ok: true; day: string; items: HistoricalProbeItem[] }
    | { ok: false; error: string }
    | null
  >(null);
  /**
   * Default batch list — pre-identified by the historical activity step-allocation
   * audit for UID 1Uwhcp4OShV3QLz3VKMHWo5B3033. 2026-05-19 and 2026-05-24 are
   * excluded because they were already repaired and verified.
   */
  const DEFAULT_BATCH_REPAIR_DAYS: readonly string[] = [
    "2026-02-24",
    "2026-05-05",
    "2026-05-06",
    "2026-05-08",
    "2026-05-09",
    "2026-05-10",
    "2026-05-11",
    "2026-05-12",
    "2026-05-13",
    "2026-05-16",
    "2026-05-18",
    "2026-05-20",
    "2026-05-21",
    "2026-05-22",
    "2026-05-23",
  ];
  const [batchDaysInput, setBatchDaysInput] = useState<string>(() =>
    DEFAULT_BATCH_REPAIR_DAYS.join("\n"),
  );
  type BatchDayStatus = "ready" | "no_workouts" | "no_repairable" | "probe_error";
  type BatchDayResult = {
    day: string;
    status: BatchDayStatus;
    items: HistoricalProbeItem[];
    error?: string;
  };
  const [batchProbe, setBatchProbe] = useState<
    | { ok: true; generatedAt: string; days: BatchDayResult[] }
    | { ok: false; error: string }
    | null
  >(null);

  const runAppleProbe = useCallback(async () => {
    if (!user) return;
    setLoading("apple");
    setAppleSyncResult(null);
    setAppleRawWorkouts(null);
    setAppleLastSyncAtAfter(null);
    try {
      const [lastSync, anchor] = await Promise.all([
        getLastSyncAt(),
        getWorkoutsAnchor(user.uid),
      ]);
      setAppleLastSyncAt(lastSync);
      setAppleAnchor(anchor ?? null);

      const token = await getIdToken(false);
      if (!token) {
        setAppleSyncResult({ ok: false, error: "No auth token", requestId: null });
        return;
      }

      const result = await runAnchoredWorkoutsSync(
        { uid: user.uid, token, limit: 500 },
        {
          getWorkoutsAnchor,
          setWorkoutsAnchor,
          pullAnchoredWorkouts,
          pullTodaySnapshot,
          ingestRawEvent,
          getTodayBounds,
          getDeviceTimezone,
          stepsIdempotencyKey,
          workoutIdempotencyKey,
          getStepCountForDateRange,
          // Workout Physiology v1 — Phase A diagnostics (dev/staging only).
          // Read-only HK probe + structured `[AH][PHYSIOLOGY_DIAGNOSE]` log;
          // gated internally on shouldLogAppleHealthPhysiologyDiagnostics().
          diagnoseWorkoutPhysiology: runAppleHealthWorkoutPhysiologyDiagnostic,
          // Workout Physiology v1 — Phase B enrichment (default ENABLED via
          // AH_WORKOUT_PHYSIOLOGY_V1). Produces avg/max HR (padded), zones,
          // energy, recovery; never throws. Caller wraps in try/catch already.
          enrichWorkoutPhysiology: (w, ctx) =>
            runAppleHealthWorkoutPhysiologyEnrichment(w, {
              neighbors: ctx.neighbors,
              userId: user.uid,
            }),
        },
      );
      if (!result.ok) {
        setAppleSyncResult({
          ok: false,
          error: result.error,
          requestId: result.requestId ?? null,
        });
      } else {
        setAppleSyncResult({
          ok: true,
          mayHaveMoreWorkouts: result.mayHaveMoreWorkouts,
        });
      }

      const lastSyncAfter = await getLastSyncAt();
      setAppleLastSyncAtAfter(lastSyncAfter);

      const cacheBust = `debug:${Date.now()}`;
      const rawRes = await getRawEvents(token, {
        kinds: ["workout"],
        limit: 5,
        cacheBust,
      });
      if (!rawRes.ok) {
        setAppleRawWorkouts({
          count: 0,
          items: [],
          requestId: rawRes.requestId,
          error: rawRes.error,
        });
        return;
      }
      const items = rawRes.json.items.map((i) => ({
        id: i.id,
        observedAt: i.observedAt,
        sourceId: i.sourceId,
        receivedAt: i.receivedAt,
      }));
      setAppleRawWorkouts({
        count: items.length,
        items,
        requestId: rawRes.requestId,
      });
    } finally {
      setLoading(null);
    }
  }, [user, getIdToken]);

  const runManualStrengthProbe = useCallback(async () => {
    if (!user) return;
    setLoading("manual_strength");
    setManualStrengthProbe(null);
    try {
      const token = await getIdToken(false);
      if (!token) {
        setManualStrengthProbe({ ok: false, error: "No auth token" });
        return;
      }
      const out = await devProbeRecentManualStrengthWorkouts(token, 20);
      setManualStrengthProbe(out);
    } finally {
      setLoading(null);
    }
  }, [user, getIdToken]);

  const copyRepairJson = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign in required");
      return;
    }
    if (stepEnrichProbe == null || stepEnrichProbe.ok !== true) {
      Alert.alert("Run the diagnose probe first");
      return;
    }
    try {
      const json = buildRepairJsonForStepEnrichProbe({
        uid: user.uid,
        day: stepEnrichProbe.day,
        items: stepEnrichProbe.items,
      });
      await Clipboard.setStringAsync(json);
      Alert.alert(
        "Copied repair JSON",
        `${stepEnrichProbe.items.length} workout(s). Paste into a file and run:\nnode scripts/admin/repair-apple-health-workout-steps.mjs --uid ${user.uid} --day ${stepEnrichProbe.day} --measurements <path>`,
      );
    } catch (e) {
      Alert.alert("Copy failed", e instanceof Error ? e.message : String(e));
    }
  }, [user, stepEnrichProbe]);

  const runStepEnrichProbe = useCallback(async () => {
    setLoading("step_enrich");
    setStepEnrichProbe(null);
    try {
      const snap = await pullTodaySnapshot();
      if (!snap.ok) {
        setStepEnrichProbe({ ok: false, error: snap.error });
        return;
      }
      const workouts = snap.data.workouts;
      if (workouts.length === 0) {
        setStepEnrichProbe({ ok: false, error: "No workouts in today's snapshot." });
        return;
      }
      const items: {
        start: string;
        end: string;
        activityName: string;
        activityId: number;
        sourceId: string | null;
        diagnose: DiagnoseStepWindowResult;
        productionGetStepCountForDateRange: number | null;
      }[] = [];
      for (const w of workouts) {
        const [diagnose, prod] = await Promise.all([
          diagnoseStepCountForWindow(w.start, w.end),
          getStepCountForDateRange(w.start, w.end),
        ]);
        items.push({
          start: w.start,
          end: w.end,
          activityName: w.activityName,
          activityId: w.activityId,
          sourceId: w.sourceId ?? null,
          diagnose,
          productionGetStepCountForDateRange: prod,
        });
      }
      const todayDay = getTodayBounds().day;
      setStepEnrichProbe({ ok: true, day: todayDay, items });
    } catch (e) {
      setStepEnrichProbe({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(null);
    }
  }, []);

  const runRecentRepairManual = useCallback(async () => {
    if (!user) {
      setRecentRepairResult({ ok: false, error: "Not signed in." });
      return;
    }
    setRecentRepairResult(null);
    setLoading("recent_repair");
    try {
      const token = await getIdToken(false);
      if (!token) {
        setRecentRepairResult({ ok: false, error: "Could not acquire ID token." });
        return;
      }
      const result = await runRecentWorkoutRepair(
        {
          uid: user.uid,
          token,
          reason: "manual-debug",
          // Manual debug bypasses the 6h throttle so each press actually runs.
          throttleMs: 0,
        },
        {
          pullWorkoutsByDateRange,
          ingestRawEvent: (body, t, opts) =>
            ingestRawEvent(body, t, opts).then((r) =>
              r.ok
                ? { ok: true as const }
                : { ok: false as const, error: r.error, requestId: r.requestId },
            ),
          getDeviceTimezone,
          getTodayDayKeyLocal,
          getLocalCalendarDayBoundsFromYmd,
          addLocalCalendarDaysToDayKey,
          workoutIdempotencyKey,
          enrichWorkoutPhysiology: (w, ctx) =>
            runAppleHealthWorkoutPhysiologyEnrichment(w, {
              neighbors: ctx.neighbors,
              userId: user.uid,
            }),
          getLastRunAt: getAppleHealthWorkoutsRecentRepairLastRunAt,
          setLastRunAtOnSuccess: setAppleHealthWorkoutsRecentRepairLastRunAt,
        },
      );
      setRecentRepairResult({ ok: true, result });
    } catch (e) {
      setRecentRepairResult({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(null);
    }
  }, [user, getIdToken]);

  const runHistoricalRepairProbe = useCallback(async () => {
    setHistoricalProbe(null);
    const day = historicalDayInput.trim();
    if (!isValidYmd(day)) {
      setHistoricalProbe({
        ok: false,
        error: "Enter a valid date as YYYY-MM-DD (e.g. 2026-05-19).",
      });
      return;
    }
    setLoading("historical_repair");
    try {
      let bounds: { start: string; end: string };
      try {
        bounds = getLocalCalendarDayBoundsFromYmd(day);
      } catch (e) {
        setHistoricalProbe({
          ok: false,
          error: `Could not derive local day bounds: ${e instanceof Error ? e.message : String(e)}`,
        });
        return;
      }
      const rangeRes = await pullWorkoutsByDateRange({
        startDate: bounds.start,
        endDate: bounds.end,
        limit: 50,
      });
      if (!rangeRes.ok) {
        setHistoricalProbe({ ok: false, error: rangeRes.error });
        return;
      }
      const allWorkouts: TodayWorkout[] = rangeRes.data.workouts;
      const repairable = filterHistoricalAppleWorkoutsForRepair(allWorkouts);
      if (repairable.length === 0) {
        const total = allWorkouts.length;
        setHistoricalProbe({
          ok: false,
          error:
            total === 0
              ? `No HealthKit workouts found for ${day}.`
              : `Found ${total} workout(s) for ${day}, but none classify as cardio or strength for step allocation.`,
        });
        return;
      }
      const items: HistoricalProbeItem[] = [];
      for (const w of repairable) {
        let measuredSteps: number | null = null;
        let probeError: string | null = null;
        try {
          measuredSteps = await getStepCountForDateRange(w.start, w.end);
        } catch (e) {
          probeError = e instanceof Error ? e.message : String(e);
        }
        items.push({
          start: w.start,
          end: w.end,
          activityName: w.activityName,
          activityId: w.activityId,
          sourceId: w.sourceId ?? null,
          measuredSteps,
          probeError,
        });
      }
      setHistoricalProbe({ ok: true, day, items });
    } catch (e) {
      setHistoricalProbe({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(null);
    }
  }, [historicalDayInput]);

  const copyHistoricalRepairJson = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign in required");
      return;
    }
    if (historicalProbe == null || historicalProbe.ok !== true) {
      Alert.alert("Run the historical probe first");
      return;
    }
    try {
      const json = buildHistoricalRepairJsonString({
        uid: user.uid,
        day: historicalProbe.day,
        items: historicalProbe.items.map((it) => ({
          start: it.start,
          end: it.end,
          activityId: it.activityId,
          sourceId: it.sourceId,
          measuredSteps: it.measuredSteps,
        })),
      });
      await Clipboard.setStringAsync(json);
      Alert.alert(
        "Copied historical repair JSON",
        `${historicalProbe.items.length} workout(s) for ${historicalProbe.day}. Save to ./repair-${historicalProbe.day}.json and run:\n\nnode scripts/admin/repair-apple-health-workout-steps.mjs \\\n  --uid ${user.uid} \\\n  --day ${historicalProbe.day} \\\n  --measurements ./repair-${historicalProbe.day}.json\n\nAdd --apply after dry-run review.`,
      );
    } catch (e) {
      Alert.alert("Copy failed", e instanceof Error ? e.message : String(e));
    }
  }, [user, historicalProbe]);

  const runBatchHistoricalRepairProbe = useCallback(async () => {
    setBatchProbe(null);
    let days: string[];
    try {
      days = parseHistoricalRepairDaysInput(batchDaysInput);
    } catch (e) {
      setBatchProbe({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      return;
    }
    if (days.length === 0) {
      setBatchProbe({
        ok: false,
        error: "Enter at least one day (YYYY-MM-DD per line).",
      });
      return;
    }
    setLoading("batch_historical_repair");
    try {
      const generatedAt = new Date().toISOString();
      const dayResults: BatchDayResult[] = [];
      for (const day of days) {
        let bounds: { start: string; end: string };
        try {
          bounds = getLocalCalendarDayBoundsFromYmd(day);
        } catch (e) {
          dayResults.push({
            day,
            status: "probe_error",
            items: [],
            error: `Could not derive local day bounds: ${e instanceof Error ? e.message : String(e)}`,
          });
          continue;
        }
        const rangeRes = await pullWorkoutsByDateRange({
          startDate: bounds.start,
          endDate: bounds.end,
          limit: 50,
        });
        if (!rangeRes.ok) {
          dayResults.push({
            day,
            status: "probe_error",
            items: [],
            error: rangeRes.error,
          });
          continue;
        }
        const allWorkouts: TodayWorkout[] = rangeRes.data.workouts;
        if (allWorkouts.length === 0) {
          dayResults.push({ day, status: "no_workouts", items: [] });
          continue;
        }
        const repairable = filterHistoricalAppleWorkoutsForRepair(allWorkouts);
        if (repairable.length === 0) {
          dayResults.push({ day, status: "no_repairable", items: [] });
          continue;
        }
        const items: HistoricalProbeItem[] = [];
        for (const w of repairable) {
          let measuredSteps: number | null = null;
          let probeError: string | null = null;
          try {
            measuredSteps = await getStepCountForDateRange(w.start, w.end);
          } catch (e) {
            probeError = e instanceof Error ? e.message : String(e);
          }
          items.push({
            start: w.start,
            end: w.end,
            activityName: w.activityName,
            activityId: w.activityId,
            sourceId: w.sourceId ?? null,
            measuredSteps,
            probeError,
          });
        }
        dayResults.push({ day, status: "ready", items });
      }
      setBatchProbe({ ok: true, generatedAt, days: dayResults });
    } catch (e) {
      setBatchProbe({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(null);
    }
  }, [batchDaysInput]);

  const copyBatchRepairJson = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign in required");
      return;
    }
    if (batchProbe == null || batchProbe.ok !== true) {
      Alert.alert("Run the batch probe first");
      return;
    }
    try {
      const json = buildBatchHistoricalRepairJsonString({
        uid: user.uid,
        generatedAt: batchProbe.generatedAt,
        days: batchProbe.days
          .filter((d) => d.status === "ready" && d.items.length > 0)
          .map((d) => ({
            day: d.day,
            items: d.items.map((it) => ({
              start: it.start,
              end: it.end,
              activityId: it.activityId,
              sourceId: it.sourceId,
              measuredSteps: it.measuredSteps,
            })),
          })),
      });
      const parsed = JSON.parse(json) as { days?: unknown[] };
      const includedDayCount = Array.isArray(parsed.days) ? parsed.days.length : 0;
      if (includedDayCount === 0) {
        Alert.alert(
          "Nothing to copy",
          "No days returned repairable workouts. Re-run the probe on days where you ran workouts.",
        );
        return;
      }
      await Clipboard.setStringAsync(json);
      Alert.alert(
        "Copied batch repair JSON",
        [
          `${includedDayCount} day(s) included.`,
          "",
          "1. Save to:",
          "   ~/oli/repair-batch-activity-steps.json",
          "",
          "2. Dry-run:",
          `   node scripts/admin/repair-apple-health-workout-steps-batch.mjs \\`,
          `     --uid ${user.uid} \\`,
          `     --measurements ~/oli/repair-batch-activity-steps.json`,
          "",
          "3. Apply:",
          `   node scripts/admin/repair-apple-health-workout-steps-batch.mjs \\`,
          `     --uid ${user.uid} \\`,
          `     --measurements ~/oli/repair-batch-activity-steps.json \\`,
          `     --apply`,
        ].join("\n"),
      );
    } catch (e) {
      Alert.alert("Copy failed", e instanceof Error ? e.message : String(e));
    }
  }, [user, batchProbe]);

  const runTitleOverrideProbe = useCallback(async () => {
    if (!user) return;
    setLoading("title_override");
    setTitleOverrideProbe(null);
    try {
      const token = await getIdToken(false);
      if (!token) {
        setTitleOverrideProbe({ ok: false, error: "No auth token" });
        return;
      }
      const out = await devProbeRecentWorkoutTitleOverrides(token, 20);
      setTitleOverrideProbe(out);
    } finally {
      setLoading(null);
    }
  }, [user, getIdToken]);

  if (!__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.warning}>This screen is only available in development.</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.warning}>Sign in to run integration probes.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Integration probes (DEV)</Text>
      <Text style={styles.hint}>No secrets logged. Only requestId, counts, timestamps.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apple Health</Text>
        <View style={styles.block}>
          <Text style={styles.label}>Last sync / Anchor (before run)</Text>
          <Text selectable style={styles.mono}>
            getLastSyncAt()={appleLastSyncAt ?? "null"} getWorkoutsAnchor(uid)=
            {appleAnchor ?? "null"}
          </Text>
        </View>
        <Pressable
          onPress={runAppleProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "apple" && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading === "apple" ? "Running…" : "Sync Now + Fetch workout raw-events"}
          </Text>
        </Pressable>
        {appleSyncResult != null && (
          <View style={styles.block}>
            <Text style={styles.label}>Sync result</Text>
            <Text selectable style={styles.mono}>
              ok={String(appleSyncResult.ok)}
              {appleSyncResult.requestId != null ? ` requestId=${appleSyncResult.requestId}` : ""}
            </Text>
            {appleSyncResult.error != null && (
              <Text style={styles.error}>{appleSyncResult.error}</Text>
            )}
          </View>
        )}
        {appleLastSyncAtAfter != null && (
          <View style={styles.block}>
            <Text style={styles.label}>getLastSyncAt() after run</Text>
            <Text selectable style={styles.mono}>{appleLastSyncAtAfter}</Text>
          </View>
        )}
        {appleRawWorkouts != null && (
          <View style={styles.block}>
            <Text style={styles.label}>Workout raw-events (limit 5)</Text>
            <Text selectable style={styles.mono}>
              count={appleRawWorkouts.count} requestId={appleRawWorkouts.requestId ?? "null"}
            </Text>
            {appleRawWorkouts.items.map((i, idx) => (
              <Text key={idx} selectable style={styles.monoSmall}>
                id={i.id} observedAt={i.observedAt} sourceId={i.sourceId} receivedAt=
                {i.receivedAt ?? "—"}
              </Text>
            ))}
            {appleRawWorkouts.error != null && (
              <Text style={styles.error}>{appleRawWorkouts.error}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout recent repair (last 14 days)</Text>
        <Text style={styles.hint}>
          Pulls the trailing 14 local-calendar days via HK date-range query and re-ingests any
          missing workouts through POST /ingest (idempotent). Mirrors the rolling repair the
          app runs automatically on workouts focus. Bypasses the 6h throttle for manual debug.
          Does NOT clear the workouts anchor or bump deepBackfillVersion.
        </Text>
        <Pressable
          onPress={runRecentRepairManual}
          disabled={!!loading}
          style={[styles.btn, loading === "recent_repair" && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading === "recent_repair" ? "Running…" : "Run recent workout repair (14d)"}
          </Text>
        </Pressable>
        {recentRepairResult != null && recentRepairResult.ok === true && (
          <View style={styles.block}>
            <Text style={styles.label}>Result</Text>
            <Text selectable style={styles.mono}>
              status={recentRepairResult.result.status} reason={recentRepairResult.result.reason}
              {recentRepairResult.result.skippedReason != null
                ? ` skippedReason=${recentRepairResult.result.skippedReason}`
                : ""}
            </Text>
            <Text selectable style={styles.monoSmall}>
              startDay={recentRepairResult.result.startDay} endDay=
              {recentRepairResult.result.endDay} daysRequested=
              {recentRepairResult.result.daysRequested}
            </Text>
            <Text selectable style={styles.monoSmall}>
              hkWorkoutCount={recentRepairResult.result.hkWorkoutCount} ingestedCount=
              {recentRepairResult.result.ingestedCount} failedCount=
              {recentRepairResult.result.failedCount} durationMs=
              {recentRepairResult.result.durationMs}
            </Text>
            {recentRepairResult.result.latestNativeWorkoutStart != null && (
              <Text selectable style={styles.monoSmall}>
                latestNativeWorkoutStart=
                {recentRepairResult.result.latestNativeWorkoutStart}
              </Text>
            )}
            {recentRepairResult.result.firstIngestError != null && (
              <Text style={styles.error}>
                firstIngestError={recentRepairResult.result.firstIngestError}
              </Text>
            )}
          </View>
        )}
        {recentRepairResult != null && recentRepairResult.ok === false && (
          <View style={styles.block}>
            <Text style={styles.error}>{recentRepairResult.error}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step enrichment diagnose (P0)</Text>
        <Text style={styles.hint}>
          Runs HK.getSamples({"{ type: \"StepCount\" }"}) for each of today's workouts at the
          exact window, ±5min, ±30min. Also calls HK.getStepCount for the full day. Shows raw
          native sample keys so we can see whether the bridge returns `value` or `quantity`,
          `startDate` or `start`, and whether samples exist at all.
        </Text>
        <Pressable
          onPress={runStepEnrichProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "step_enrich" && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading === "step_enrich" ? "Probing…" : "Diagnose step enrichment for today's workouts"}
          </Text>
        </Pressable>
        {stepEnrichProbe != null && stepEnrichProbe.ok === true && (
          <Pressable
            onPress={copyRepairJson}
            disabled={!!loading}
            style={[styles.btn, { backgroundColor: "#34C759" }]}
          >
            <Text style={styles.btnText}>Copy repair JSON (for admin script)</Text>
          </Pressable>
        )}
        {stepEnrichProbe != null && (
          <View style={styles.block}>
            {stepEnrichProbe.ok === false ? (
              <Text style={styles.error}>{stepEnrichProbe.error}</Text>
            ) : (
              stepEnrichProbe.items.map((it, idx) => (
                <View key={idx} style={{ gap: 4, marginBottom: 8 }}>
                  <Text selectable style={styles.label}>
                    {it.activityName} (id={it.activityId})
                  </Text>
                  <Text selectable style={styles.monoSmall}>
                    start={it.start}
                  </Text>
                  <Text selectable style={styles.monoSmall}>
                    end={it.end}
                  </Text>
                  <Text selectable style={styles.monoSmall}>
                    production getStepCountForDateRange = {String(it.productionGetStepCountForDateRange)}
                  </Text>
                  <Text selectable style={styles.monoSmall}>
                    nativeAvailable={String(it.diagnose.nativeAvailable)}{" "}
                    hasGetSamples={String(it.diagnose.hasGetSamples)}
                  </Text>
                  {it.diagnose.windows.map((w, j) => (
                    <Text key={j} selectable style={styles.monoSmall}>
                      [{w.label}] count={w.sampleCount} sumByValue={w.sumByValueKey}{" "}
                      sumByQuantity={w.sumByQuantityKey} keys=
                      {w.firstSampleKeys ? w.firstSampleKeys.join(",") : "—"} err=
                      {w.error ?? "—"}
                    </Text>
                  ))}
                  {it.diagnose.fullDayCumulativeSum && (
                    <Text selectable style={styles.monoSmall}>
                      [getStepCount day] value=
                      {String(it.diagnose.fullDayCumulativeSum.value)} err=
                      {it.diagnose.fullDayCumulativeSum.error ?? "—"}
                    </Text>
                  )}
                  <Text selectable style={styles.monoSmall}>
                    rawSamplesExact={JSON.stringify(
                      it.diagnose.windows[0]?.samples?.slice(0, 3) ?? null,
                    )}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historical Activity Step Repair</Text>
        <Text style={styles.hint}>
          Probe HealthKit for the workouts on a past local day, re-run
          getStepCountForDateRange against each workout window, and copy the JSON consumed
          by scripts/admin/repair-apple-health-workout-steps.mjs. This screen NEVER writes
          to Firestore; the admin script is the only path that mutates data.
        </Text>
        <View style={styles.block}>
          <Text style={styles.label}>Local day (YYYY-MM-DD)</Text>
          <TextInput
            value={historicalDayInput}
            onChangeText={setHistoricalDayInput}
            placeholder="2026-05-19"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            testID="historical-repair-day-input"
          />
        </View>
        <Pressable
          onPress={runHistoricalRepairProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "historical_repair" && styles.btnDisabled]}
          testID="historical-repair-probe-btn"
        >
          <Text style={styles.btnText}>
            {loading === "historical_repair" ? "Probing…" : "Probe historical workouts"}
          </Text>
        </Pressable>
        {historicalProbe != null && historicalProbe.ok === true && (
          <Pressable
            onPress={copyHistoricalRepairJson}
            disabled={!!loading}
            style={[styles.btn, { backgroundColor: "#34C759" }]}
            testID="historical-repair-copy-btn"
          >
            <Text style={styles.btnText}>Copy historical repair JSON</Text>
          </Pressable>
        )}
        {historicalProbe != null && (
          <View style={styles.block}>
            {historicalProbe.ok === false ? (
              <Text style={styles.error} testID="historical-repair-error">
                {historicalProbe.error}
              </Text>
            ) : (
              <>
                <Text selectable style={styles.label}>
                  {historicalProbe.items.length} repairable workout(s) on {historicalProbe.day}
                </Text>
                {historicalProbe.items.map((it, idx) => (
                  <View key={idx} style={{ gap: 4, marginBottom: 8 }}>
                    <Text selectable style={styles.label}>
                      {it.activityName} (id={it.activityId})
                    </Text>
                    <Text selectable style={styles.monoSmall}>
                      start={it.start}
                    </Text>
                    <Text selectable style={styles.monoSmall}>
                      end={it.end}
                    </Text>
                    <Text selectable style={styles.monoSmall}>
                      sourceId={it.sourceId ?? "—"}
                    </Text>
                    <Text selectable style={styles.monoSmall}>
                      measured getStepCountForDateRange = {String(it.measuredSteps)}
                      {it.measuredSteps == null
                        ? " (will be skipped by admin script — fail-closed)"
                        : ""}
                    </Text>
                    {it.probeError != null && (
                      <Text selectable style={styles.error}>
                        probe error: {it.probeError}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={[styles.block, { marginTop: 12 }]}>
          <Text style={styles.label}>Batch mode — Days to repair</Text>
          <Text style={styles.hint}>
            One YYYY-MM-DD per line (commas and spaces also work). Default list is the
            remaining affected days from the historical step-allocation audit
            (2026-05-19 and 2026-05-24 already repaired and excluded).
          </Text>
          <TextInput
            value={batchDaysInput}
            onChangeText={setBatchDaysInput}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={styles.batchInput}
            testID="historical-repair-batch-input"
          />
        </View>
        <Pressable
          onPress={runBatchHistoricalRepairProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "batch_historical_repair" && styles.btnDisabled]}
          testID="historical-repair-batch-probe-btn"
        >
          <Text style={styles.btnText}>
            {loading === "batch_historical_repair"
              ? "Probing batch…"
              : "Probe batch historical workouts"}
          </Text>
        </Pressable>
        {batchProbe != null && batchProbe.ok === true && (
          <Pressable
            onPress={copyBatchRepairJson}
            disabled={!!loading}
            style={[styles.btn, { backgroundColor: "#34C759" }]}
            testID="historical-repair-batch-copy-btn"
          >
            <Text style={styles.btnText}>Copy batch repair JSON</Text>
          </Pressable>
        )}
        {batchProbe != null && (
          <View style={styles.block}>
            {batchProbe.ok === false ? (
              <Text style={styles.error} testID="historical-repair-batch-error">
                {batchProbe.error}
              </Text>
            ) : (
              <>
                {(() => {
                  const ready = batchProbe.days.filter(
                    (d) => d.status === "ready",
                  ).length;
                  const noWorkouts = batchProbe.days.filter(
                    (d) => d.status === "no_workouts",
                  ).length;
                  const noRepairable = batchProbe.days.filter(
                    (d) => d.status === "no_repairable",
                  ).length;
                  const errored = batchProbe.days.filter(
                    (d) => d.status === "probe_error",
                  ).length;
                  return (
                    <Text selectable style={styles.label}>
                      batch summary: {batchProbe.days.length} day(s) probed — ready=
                      {ready} no_workouts={noWorkouts} no_repairable={noRepairable}
                      {" "}errors={errored}
                    </Text>
                  );
                })()}
                {batchProbe.days.map((d) => (
                  <View
                    key={d.day}
                    style={{ gap: 4, marginBottom: 10 }}
                    testID={`historical-repair-batch-day-${d.day}`}
                  >
                    <Text selectable style={styles.label}>
                      {d.day} — status: {d.status} (workouts: {d.items.length})
                    </Text>
                    {d.error != null && (
                      <Text selectable style={styles.error}>
                        {d.error}
                      </Text>
                    )}
                    {d.items.map((it, idx) => (
                      <View key={idx} style={{ gap: 2, marginLeft: 6 }}>
                        <Text selectable style={styles.monoSmall}>
                          {it.activityName} (id={it.activityId})
                        </Text>
                        <Text selectable style={styles.monoSmall}>
                          start={it.start}
                        </Text>
                        <Text selectable style={styles.monoSmall}>
                          end={it.end}
                        </Text>
                        <Text selectable style={styles.monoSmall}>
                          sourceId={it.sourceId ?? "—"}
                        </Text>
                        <Text selectable style={styles.monoSmall}>
                          measured={String(it.measuredSteps)}
                          {it.measuredSteps == null
                            ? " (will be skipped — fail-closed)"
                            : ""}
                        </Text>
                        {it.probeError != null && (
                          <Text selectable style={styles.error}>
                            probe error: {it.probeError}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual strength (rawEvents)</Text>
        <Pressable
          onPress={runManualStrengthProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "manual_strength" && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading === "manual_strength" ? "Loading…" : "Probe last manual strength_workout rows"}
          </Text>
        </Pressable>
        {manualStrengthProbe != null && (
          <View style={styles.block}>
            {manualStrengthProbe.ok === false ? (
              <Text style={styles.error}>{manualStrengthProbe.error}</Text>
            ) : (
              manualStrengthProbe.rows.map((r) => (
                <Text key={r.id} selectable style={styles.monoSmall}>
                  id={r.id} observedAt={r.observedAt} exercises={r.exerciseCount} displayName=
                  {r.displayName ?? "—"}
                </Text>
              ))
            )}
          </View>
        )}
        <Pressable
          onPress={runTitleOverrideProbe}
          disabled={!!loading}
          style={[styles.btn, loading === "title_override" && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading === "title_override" ? "Loading…" : "Probe workout_title_override rows"}
          </Text>
        </Pressable>
        {titleOverrideProbe != null && (
          <View style={styles.block}>
            {titleOverrideProbe.ok === false ? (
              <Text style={styles.error}>{titleOverrideProbe.error}</Text>
            ) : (
              titleOverrideProbe.rows.map((r) => (
                <Text key={r.id} selectable style={styles.monoSmall}>
                  id={r.id} target={r.targetWorkoutId ?? "—"} name={r.displayName ?? "—"} observedAt={r.observedAt}
                </Text>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  warning: { fontSize: 15, color: "#8E8E93", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  hint: { fontSize: 12, color: "#8E8E93" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#3C3C43" },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  block: { backgroundColor: "#F2F2F7", padding: 12, borderRadius: 10, gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#6E6E73" },
  mono: { fontFamily: "Menlo", fontSize: 11, color: "#1C1C1E" },
  monoSmall: { fontFamily: "Menlo", fontSize: 10, color: "#3C3C43" },
  error: { fontSize: 12, color: "#FF3B30" },
  input: {
    fontFamily: "Menlo",
    fontSize: 13,
    color: "#1C1C1E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C7C7CC",
    minWidth: 160,
    alignSelf: "flex-start",
  },
  batchInput: {
    fontFamily: "Menlo",
    fontSize: 12,
    color: "#1C1C1E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C7C7CC",
    minHeight: 160,
    textAlignVertical: "top",
  },
});
