// app/(app)/command-center/index.tsx
import { ScrollView, View, StyleSheet, Pressable, Text, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { ModuleTile } from "@/lib/ui/ModuleTile";
import { CommandCenterHeader } from "@/lib/ui/CommandCenterHeader";
import { COMMAND_CENTER_MODULES } from "@/lib/modules/commandCenterModules";
import { getModuleBadge, isModuleDisabled } from "@/lib/modules/commandCenterReadiness";

import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { useIntelligenceContext } from "@/lib/data/useIntelligenceContext";
import { useDayTruth } from "@/lib/data/useDayTruth";

import { isCompatiblePipelineVersion, isFreshComputedAt } from "@/lib/data/readiness";
import { PIPELINE_VERSION } from "@/lib/pipeline/version";
import { subscribeRefresh, consumeRefresh } from "@/lib/navigation/refreshBus";

// ✅ Step 5 (Replay UI)
import { useDerivedLedgerRuns } from "@/lib/data/useDerivedLedgerRuns";
import { useDerivedLedgerReplay } from "@/lib/data/useDerivedLedgerReplay";
import type { DerivedLedgerReplayResponseDto, DerivedLedgerRunsResponseDto } from "@/lib/contracts/derivedLedger";

type StatusTone = "neutral" | "success" | "warning" | "danger";

const toneLabel: Record<StatusTone, string> = {
  neutral: "Status",
  success: "Ready",
  warning: "Needs input",
  danger: "Error",
};

const toneColor: Record<StatusTone, string> = {
  neutral: "#1C1C1E",
  success: "#1B5E20",
  warning: "#7A4E00",
  danger: "#B00020",
};

const toneBg: Record<StatusTone, string> = {
  neutral: "#F2F2F7",
  success: "#E9F7EC",
  warning: "#FFF5E6",
  danger: "#FDECEC",
};

function formatTodaySummary(input: {
  facts?: { steps?: number; sleepMin?: number; weightKg?: number };
  insightsCount?: number;
  optimistic?: { weightKg?: number };
  isSyncingOptimistic?: boolean;
}): string {
  const parts: string[] = [];

  if (typeof input.facts?.steps === "number") parts.push(`${input.facts.steps.toLocaleString()} steps`);
  if (typeof input.facts?.sleepMin === "number") parts.push(`${Math.round(input.facts.sleepMin)} min sleep`);

  const effectiveWeightKg =
    typeof input.facts?.weightKg === "number"
      ? input.facts.weightKg
      : typeof input.optimistic?.weightKg === "number"
        ? input.optimistic.weightKg
        : null;

  if (typeof effectiveWeightKg === "number") {
    const suffix = input.isSyncingOptimistic ? " (syncing…)" : "";
    parts.push(`${effectiveWeightKg.toFixed(1)} kg${suffix}`);
  }

  if (typeof input.insightsCount === "number") parts.push(`${input.insightsCount} insights`);

  return parts.length ? parts.join(" • ") : "No facts yet — log your first event to start building today.";
}

function formatIsoToHms(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function DevPipelineOverlay(props: {
  canonicalAt?: string | null;
  factsAt?: string | null;
  contextAt?: string | null;
  factsPv?: number | null;
  ctxPv?: number | null;
}) {
  if (!__DEV__) return null;

  return (
    <View style={styles.devOverlay}>
      <Text style={styles.devOverlayTitle}>Pipeline timestamps (dev)</Text>
      <Text style={styles.devOverlayLine}>Canonical: {formatIsoToHms(props.canonicalAt)}</Text>
      <Text style={styles.devOverlayLine}>Facts: {formatIsoToHms(props.factsAt)}</Text>
      <Text style={styles.devOverlayLine}>Context: {formatIsoToHms(props.contextAt)}</Text>
      <Text style={styles.devOverlayLine}>
        PV: facts {props.factsPv ?? "—"} / ctx {props.ctxPv ?? "—"} (expected {PIPELINE_VERSION})
      </Text>
    </View>
  );
}

function parseOptionalNumber(s: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type ReplayUiState =
  | { enabled: false }
  | {
      enabled: true;
      selectedRunId: string | null;
      asOf: string;
      runs: ReturnType<typeof useDerivedLedgerRuns>;
      replay: ReturnType<typeof useDerivedLedgerReplay>;
      replayDoc: DerivedLedgerReplayResponseDto | null;
      replayLoading: boolean;
      replayMissing: boolean;
      replayError: string | null;
    };

function ReplayControlsDev(props: {
  day: string;
  value: ReplayUiState;
  onChange: (next: ReplayUiState) => void;
}) {
  if (!__DEV__) return null;

  const enabled = props.value.enabled;
  const [expanded, setExpanded] = useState(false);

  const selectedRunId = enabled ? props.value.selectedRunId : null;
  const asOf = enabled ? props.value.asOf : "";

  const runs = useDerivedLedgerRuns(props.day);

  const effectiveRunId = enabled
    ? selectedRunId ?? (runs.status === "ready" ? runs.data.latestRunId ?? null : null)
    : null;

  const replay = useDerivedLedgerReplay({
    day: props.day,
    ...(effectiveRunId ? { runId: effectiveRunId } : {}),
    ...(asOf.trim().length > 0 ? { asOf: asOf.trim() } : {}),
  });

  const replayDoc = replay.status === "ready" ? replay.data : null;

  const replayLoading = enabled ? replay.status === "loading" : false;
  const replayMissing = enabled ? replay.status === "missing" : false;
  const replayError = enabled ? (replay.status === "error" ? replay.error : null) : null;

  // --- ✅ Loop-proof parent sync ---

  const onChangeRef = useRef(props.onChange);
  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  const lastSigRef = useRef<string>("");

  const runsLatestRunId = runs.status === "ready" ? runs.data.latestRunId ?? null : null;
  const runsCount = runs.status === "ready" ? runs.data.runs.length : 0;

  const replayRunId = replay.status === "ready" ? replay.data.runId : null;
  const replayComputedAt = replay.status === "ready" ? replay.data.computedAt : null;

  useEffect(() => {
    if (!enabled) return;

    const sigObj = {
      enabled: true as const,
      selectedRunId: selectedRunId ?? null,
      asOf,
      effectiveRunId,
      runsStatus: runs.status,
      runsLatestRunId,
      runsCount,
      replayStatus: replay.status,
      replayRunId,
      replayComputedAt,
      replayLoading,
      replayMissing,
      replayError,
    };

    const sig = JSON.stringify(sigObj);
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    onChangeRef.current({
      enabled: true,
      selectedRunId: selectedRunId ?? null,
      asOf,
      runs,
      replay,
      replayDoc,
      replayLoading,
      replayMissing,
      replayError,
    });
  }, [
    enabled,
    selectedRunId,
    asOf,
    effectiveRunId,
    runs.status,
    runsLatestRunId,
    runsCount,
    replay.status,
    replayRunId,
    replayComputedAt,
    replayLoading,
    replayMissing,
    replayError,
    runs,
    replay,
    replayDoc,
  ]);

  const toggleEnabled = () => {
    if (enabled) {
      props.onChange({ enabled: false });
      setExpanded(false);
      return;
    }

    props.onChange({
      enabled: true,
      selectedRunId: null,
      asOf: "",
      runs,
      replay,
      replayDoc,
      replayLoading: true,
      replayMissing: false,
      replayError: null,
    });
  };

  type RunSummary = DerivedLedgerRunsResponseDto["runs"][number];
  const runsList: RunSummary[] = runs.status === "ready" ? runs.data.runs : [];

  return (
    <View style={styles.replayWrap}>
      <View style={styles.replayTopRow}>
        <Text style={styles.replayTitle}>Replay Mode (dev)</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={enabled ? "Disable replay mode" : "Enable replay mode"}
          onPress={toggleEnabled}
          style={({ pressed }) => [
            styles.replayToggle,
            enabled ? styles.replayToggleOn : styles.replayToggleOff,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.replayToggleText, !enabled && { color: "#111827" }]}>{enabled ? "ON" : "OFF"}</Text>
        </Pressable>
      </View>

      {!enabled ? (
        <Text style={styles.replayHint}>
          When enabled, Command Center uses Derived Ledger snapshots instead of live truth.
        </Text>
      ) : (
        <>
          <Text style={styles.replayHint}>
            Select a ledger run to replay “what was known at the time”. Live truth is not used.
          </Text>

          <View style={styles.replayRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pick replay run"
              onPress={() => setExpanded((v) => !v)}
              style={({ pressed }) => [styles.replayButton, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.replayButtonText}>{effectiveRunId ? `Run: ${effectiveRunId}` : "Pick a run"}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use latest run"
              onPress={() => {
                const latest = runs.status === "ready" ? runs.data.latestRunId ?? null : null;
                props.onChange({
                  enabled: true,
                  selectedRunId: latest,
                  asOf,
                  runs,
                  replay,
                  replayDoc,
                  replayLoading,
                  replayMissing,
                  replayError,
                });
              }}
              style={({ pressed }) => [styles.replayButtonSecondary, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.replayButtonSecondaryText}>Latest</Text>
            </Pressable>
          </View>

          <View style={styles.replayInputRow}>
            <Text style={styles.replayInputLabel}>asOf (optional)</Text>
            <TextInput
              value={asOf}
              onChangeText={(t) => {
                if (!enabled) return;
                props.onChange({
                  enabled: true,
                  selectedRunId: selectedRunId ?? null,
                  asOf: t,
                  runs,
                  replay,
                  replayDoc,
                  replayLoading,
                  replayMissing,
                  replayError,
                });
              }}
              placeholder="2026-01-16T12:00:00.000Z"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.replayInput}
            />
          </View>

          {expanded ? (
            <View style={styles.replayList}>
              {runs.status === "loading" ? (
                <Text style={styles.replayListHint}>Loading runs…</Text>
              ) : runs.status === "missing" ? (
                <Text style={styles.replayListHint}>No runs found for this day.</Text>
              ) : runs.status === "error" ? (
                <Text style={styles.replayListHint}>Error loading runs: {runs.error}</Text>
              ) : runsList.length === 0 ? (
                <Text style={styles.replayListHint}>No runs yet for this day.</Text>
              ) : (
                runsList.map((r) => {
                  const selected = r.runId === effectiveRunId;
                  return (
                    <Pressable
                      key={r.runId}
                      accessibilityRole="button"
                      accessibilityLabel={`Select run ${r.runId}`}
                      onPress={() => {
                        props.onChange({
                          enabled: true,
                          selectedRunId: r.runId,
                          asOf,
                          runs,
                          replay,
                          replayDoc,
                          replayLoading,
                          replayMissing,
                          replayError,
                        });
                        setExpanded(false);
                      }}
                      style={({ pressed }) => [
                        styles.replayListItem,
                        selected && styles.replayListItemSelected,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={styles.replayListRunId}>{r.runId}</Text>
                      <Text style={styles.replayListMeta}>
                        {r.computedAt} • pv {r.pipelineVersion}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}

          <View style={styles.replayStatusRow}>
            <Text style={styles.replayStatusText}>
              {replayLoading
                ? "Loading replay…"
                : replayMissing
                  ? "Replay missing."
                  : replayError
                    ? `Replay error: ${replayError}`
                    : replayDoc
                      ? `Replaying run ${replayDoc.runId}`
                      : "—"}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function DataStatusCard(props: {
  day: string;
  refreshKey: string | null;
  focusNonce: number;
  optimisticWeightKg: number | null;

  // Step 5 replay surface
  replayOverride?: DerivedLedgerReplayResponseDto | null;
  replayLoading?: boolean;
  replayMissing?: boolean;
  replayError?: string | null;
}) {
  const dayTruth = useDayTruth(props.day);
  const facts = useDailyFacts(props.day);
  const insights = useInsights(props.day);
  const ctx = useIntelligenceContext(props.day);

  const refetchDayTruth = dayTruth.refetch;
  const refetchFacts = facts.refetch;
  const refetchInsights = insights.refetch;
  const refetchCtx = ctx.refetch;

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const lastRefreshKey = useRef<string | null>(null);

  const baselineWeightKg = useRef<number | null>(null);
  const baselineCanonicalAt = useRef<string | null>(null);
  const baselineFactsAt = useRef<string | null>(null);
  const baselineCtxAt = useRef<string | null>(null);

  const latestEventAtLive = dayTruth.status === "ready" ? dayTruth.data.latestCanonicalEventAt : null;
  const hasEventsLive = dayTruth.status === "ready" && dayTruth.data.eventsCount > 0;

  const replay = props.replayOverride ?? null;
  const replayModeActive =
    Boolean(replay) || Boolean(props.replayLoading) || Boolean(props.replayMissing) || Boolean(props.replayError);

  // In replay mode, do NOT “borrow” live derived truth.
  const latestEventAt = replayModeActive ? replay?.latestCanonicalEventAt ?? null : latestEventAtLive;
  const hasEvents = replayModeActive ? Boolean(replay?.latestCanonicalEventAt) : hasEventsLive;

  const factsDoc = replayModeActive ? replay?.dailyFacts : facts.status === "ready" ? facts.data : null;
  const ctxDoc = replayModeActive ? replay?.intelligenceContext : ctx.status === "ready" ? ctx.data : null;
  const insightsDoc = replayModeActive ? replay?.insights : insights.status === "ready" ? insights.data : null;

  const factsComputedAt =
    factsDoc && typeof (factsDoc as unknown as { meta?: { computedAt?: unknown } })?.meta?.computedAt === "string"
      ? (factsDoc as unknown as { meta: { computedAt: string } }).meta.computedAt
      : factsDoc && typeof (factsDoc as unknown as { computedAt?: unknown })?.computedAt === "string"
        ? (factsDoc as unknown as { computedAt: string }).computedAt
        : null;

  const ctxComputedAt =
    ctxDoc && typeof (ctxDoc as unknown as { meta?: { computedAt?: unknown } })?.meta?.computedAt === "string"
      ? (ctxDoc as unknown as { meta: { computedAt: string } }).meta.computedAt
      : ctxDoc && typeof (ctxDoc as unknown as { computedAt?: unknown })?.computedAt === "string"
        ? (ctxDoc as unknown as { computedAt: string }).computedAt
        : null;

  const factsFresh = isFreshComputedAt({ computedAtIso: factsComputedAt, latestEventAtIso: latestEventAt });
  const ctxFresh = isFreshComputedAt({ computedAtIso: ctxComputedAt, latestEventAtIso: latestEventAt });

  const factsPipelineVersion =
    factsDoc && typeof (factsDoc as unknown as { meta?: { pipelineVersion?: unknown } })?.meta?.pipelineVersion === "number"
      ? (factsDoc as unknown as { meta: { pipelineVersion: number } }).meta.pipelineVersion
      : null;

  const ctxPipelineVersion =
    ctxDoc && typeof (ctxDoc as unknown as { meta?: { pipelineVersion?: unknown } })?.meta?.pipelineVersion === "number"
      ? (ctxDoc as unknown as { meta: { pipelineVersion: number } }).meta.pipelineVersion
      : null;

  const factsVersionOk = isCompatiblePipelineVersion({
    pipelineVersion: factsPipelineVersion,
    expectedPipelineVersion: PIPELINE_VERSION,
  });

  const ctxVersionOk = isCompatiblePipelineVersion({
    pipelineVersion: ctxPipelineVersion,
    expectedPipelineVersion: PIPELINE_VERSION,
  });

  // Replay correctness: do NOT consider “freshness” against current canonical.
  // In replay mode, readiness means “snapshots exist and are internally consistent (PV ok).”
  const derivedReady = replayModeActive
    ? Boolean(factsDoc) && Boolean(ctxDoc) && factsVersionOk && ctxVersionOk
    : hasEvents
      ? factsFresh && ctxFresh && factsVersionOk && ctxVersionOk
      : false;

  const anyLoading =
    replayModeActive
      ? Boolean(props.replayLoading) || dayTruth.status === "loading"
      : dayTruth.status === "loading" ||
        facts.status === "loading" ||
        insights.status === "loading" ||
        ctx.status === "loading";

  const anyError =
    replayModeActive
      ? Boolean(props.replayError) || dayTruth.status === "error"
      : dayTruth.status === "error" ||
        facts.status === "error" ||
        insights.status === "error" ||
        ctx.status === "error";

  const currentWeightKg =
    factsDoc && typeof (factsDoc as unknown as { body?: { weightKg?: unknown } })?.body?.weightKg === "number"
      ? (factsDoc as unknown as { body: { weightKg: number } }).body.weightKg
      : null;

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const kickRefetch = useCallback(
    (cacheBust?: string) => {
      const opts = cacheBust ? { cacheBust } : undefined;
      void refetchDayTruth(opts);
      void refetchFacts(opts);
      void refetchInsights(opts);
      void refetchCtx(opts);
    },
    [refetchDayTruth, refetchFacts, refetchInsights, refetchCtx],
  );

  useEffect(() => {
    kickRefetch();
  }, [props.focusNonce, kickRefetch]);

  useEffect(() => {
    const rk = props.refreshKey;
    if (!rk) return;

    if (lastRefreshKey.current === rk) return;
    lastRefreshKey.current = rk;

    baselineWeightKg.current = currentWeightKg;
    baselineCanonicalAt.current = latestEventAt ?? null;
    baselineFactsAt.current = factsComputedAt ?? null;
    baselineCtxAt.current = ctxComputedAt ?? null;

    stopPolling();
    pollCount.current = 0;

    kickRefetch(rk);

    pollTimer.current = setInterval(() => {
      pollCount.current += 1;
      kickRefetch(rk);
      if (pollCount.current >= 90) stopPolling();
    }, 1000);

    return () => stopPolling();
  }, [props.refreshKey, currentWeightKg, latestEventAt, factsComputedAt, ctxComputedAt, kickRefetch, stopPolling]);

  useEffect(() => {
    if (!pollTimer.current) return;

    const bw = baselineWeightKg.current;
    const bc = baselineCanonicalAt.current;
    const bf = baselineFactsAt.current;
    const bctx = baselineCtxAt.current;

    const weightAppeared = bw === null && typeof currentWeightKg === "number";
    const weightChanged = typeof bw === "number" && typeof currentWeightKg === "number" && currentWeightKg !== bw;

    const canonicalAdvanced = bc === null ? latestEventAt !== null : latestEventAt !== null && latestEventAt !== bc;
    const factsAdvanced = bf === null ? factsComputedAt !== null : factsComputedAt !== null && factsComputedAt !== bf;
    const ctxAdvanced = bctx === null ? ctxComputedAt !== null : ctxComputedAt !== null && ctxComputedAt !== bctx;

    const pipelineCaughtUp = canonicalAdvanced && derivedReady && factsAdvanced && ctxAdvanced;

    if (weightAppeared || weightChanged || pipelineCaughtUp) stopPolling();
  }, [currentWeightKg, latestEventAt, factsComputedAt, ctxComputedAt, derivedReady, stopPolling]);

  let tone: StatusTone = "neutral";
  let title = "Checking your data…";
  let subtitle = "Syncing today’s canonical events and derived truth.";

  if (anyLoading) {
    tone = "neutral";
    title = replayModeActive ? "Loading replay…" : "Checking your data…";
    subtitle = replayModeActive
      ? "Fetching Derived Ledger snapshots for this run."
      : "Syncing today’s canonical events and derived truth.";
  } else if (anyError) {
    tone = "danger";
    title = replayModeActive ? "Replay failed" : "Couldn’t load your data";
    const msg =
      props.replayError ??
      (dayTruth.status === "error" ? dayTruth.error : null) ??
      (!replayModeActive && facts.status === "error" ? facts.error : null) ??
      (!replayModeActive && insights.status === "error" ? insights.error : null) ??
      (!replayModeActive && ctx.status === "error" ? ctx.error : null) ??
      "Please try again.";
    subtitle = msg;
  } else if (replayModeActive && props.replayMissing) {
    tone = "warning";
    title = "Replay missing";
    subtitle = "No Derived Ledger replay found for this selection.";
  } else if (dayTruth.status === "ready" && !hasEvents) {
    tone = "warning";
    title = "No data yet for today";
    subtitle = "Log your first event (weight, workout, sleep, steps) to start building your Health OS.";
  } else if (!derivedReady) {
    tone = "neutral";
    title = replayModeActive ? "Replay incomplete" : "Computing today…";
    subtitle = replayModeActive
      ? "This replay run does not include all required snapshots (facts/context) or pipeline versions mismatch."
      : "Waiting for derived truth to catch up to canonical events.";
  } else if (derivedReady) {
    tone = "success";
    title = replayModeActive ? "Replay is ready" : "Today is ready";
    subtitle = ["Events ✓", "Facts ✓", "Context ✓"].join("  •  ");
  }

  const optimistic = typeof props.optimisticWeightKg === "number" ? props.optimisticWeightKg : null;

  const eps = 0.01;
  const factsMatchOptimistic =
    typeof currentWeightKg === "number" && optimistic !== null && Math.abs(currentWeightKg - optimistic) < eps;

  const inRefreshWindow = props.refreshKey !== null && optimistic !== null && !factsMatchOptimistic;

  const shouldPreferOptimisticWeight =
    !replayModeActive && optimistic !== null && (inRefreshWindow || !factsFresh || typeof currentWeightKg !== "number");

  const factsSummary =
    factsDoc
      ? {
          ...(typeof (factsDoc as unknown as { activity?: { steps?: unknown } })?.activity?.steps === "number"
            ? { steps: (factsDoc as unknown as { activity: { steps: number } }).activity.steps }
            : {}),
          ...(typeof (factsDoc as unknown as { sleep?: { totalMinutes?: unknown } })?.sleep?.totalMinutes === "number"
            ? { sleepMin: (factsDoc as unknown as { sleep: { totalMinutes: number } }).sleep.totalMinutes }
            : {}),
          ...(!shouldPreferOptimisticWeight &&
          typeof (factsDoc as unknown as { body?: { weightKg?: unknown } })?.body?.weightKg === "number"
            ? { weightKg: (factsDoc as unknown as { body: { weightKg: number } }).body.weightKg }
            : {}),
        }
      : null;

  const isSyncingOptimistic = shouldPreferOptimisticWeight && optimistic !== null && hasEvents;

  const insightsCount =
    insightsDoc && typeof (insightsDoc as unknown as { count?: unknown })?.count === "number"
      ? (insightsDoc as unknown as { count: number }).count
      : undefined;

  const summary = formatTodaySummary({
    ...(factsSummary && Object.keys(factsSummary).length > 0 ? { facts: factsSummary } : {}),
    ...(typeof insightsCount === "number" ? { insightsCount } : {}),
    ...(optimistic !== null ? { optimistic: { weightKg: optimistic } } : {}),
    ...(isSyncingOptimistic ? { isSyncingOptimistic: true } : {}),
  });

  const canonicalAt = latestEventAt;

  return (
    <View style={[styles.statusCard, { backgroundColor: toneBg[tone] }]}>
      <View style={styles.statusTopRow}>
        <Text style={[styles.statusPill, { color: toneColor[tone] }]}>{toneLabel[tone]}</Text>
        <Text style={styles.statusDay}>{props.day}</Text>
      </View>

      <Text style={[styles.statusTitle, { color: toneColor[tone] }]}>{title}</Text>
      <Text style={styles.statusSubtitle}>{subtitle}</Text>

      <View style={styles.summaryWrap}>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      {__DEV__ ? (
        <DevPipelineOverlay
          canonicalAt={canonicalAt}
          factsAt={factsComputedAt}
          contextAt={ctxComputedAt}
          factsPv={factsPipelineVersion}
          ctxPv={ctxPipelineVersion}
        />
      ) : null}
    </View>
  );
}

function QuickActionsRow() {
  const router = useRouter();

  return (
    <View style={styles.quickRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Weight"
        onPress={() => router.push("/(app)/body/weight")}
        style={({ pressed }) => [styles.quickButton, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.quickButtonTitle}>Log Weight</Text>
        <Text style={styles.quickButtonSubtitle}>Fast daily weigh-in</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Workout"
        onPress={() => router.push("/(app)/workouts")}
        style={({ pressed }) => [styles.quickButton, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.quickButtonTitle}>Log Workout</Text>
        <Text style={styles.quickButtonSubtitle}>Training session</Text>
      </Pressable>
    </View>
  );
}

export default function CommandCenterScreen() {
  const router = useRouter();
  const day = getTodayDayKey();

  const params = useLocalSearchParams<{ refresh?: string; ow?: string }>();
  const refreshParam = typeof params.refresh === "string" ? params.refresh : null;
  const owParam = typeof params.ow === "string" ? params.ow : null;

  const [focusNonce, setFocusNonce] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusNonce((n) => n + 1);
      return undefined;
    }, []),
  );

  const [refreshKey, setRefreshKey] = useState<string | null>(null);
  const [optimisticWeightKg, setOptimisticWeightKg] = useState<number | null>(null);

  useEffect(() => {
    if (!refreshParam) return;
    setRefreshKey((prev) => (prev === refreshParam ? prev : refreshParam));
  }, [refreshParam]);

  useEffect(() => {
    const ow = parseOptionalNumber(owParam);
    if (ow === null) return;
    setOptimisticWeightKg(ow);
  }, [owParam]);

  useEffect(() => {
    const unsub = subscribeRefresh((ev) => {
      if (ev.topic !== "commandCenter") return;

      setRefreshKey((prev) => (prev === ev.key ? prev : ev.key));

      if (typeof ev.optimisticWeightKg === "number") {
        setOptimisticWeightKg(ev.optimisticWeightKg);
      }

      consumeRefresh(ev.topic, ev.key);
    });
    return unsub;
  }, []);

  const statusCardKey = useMemo(() => `${day}:${refreshKey ?? "no-refresh"}`, [day, refreshKey]);

  const [replayState, setReplayState] = useState<ReplayUiState>({ enabled: false });

  const replayOverride = replayState.enabled ? replayState.replayDoc : null;
  const replayLoading = replayState.enabled ? replayState.replayLoading : false;
  const replayMissing = replayState.enabled ? replayState.replayMissing : false;
  const replayError = replayState.enabled ? replayState.replayError : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <CommandCenterHeader title="Command Center" subtitle="Your health, unified" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/(app)/settings")}
            style={({ pressed }) => [styles.gearButton, pressed && styles.gearPressed]}
          >
            <Text style={styles.gearText}>⚙️</Text>
          </Pressable>
        </View>

        <ReplayControlsDev day={day} value={replayState} onChange={setReplayState} />

        <DataStatusCard
          key={statusCardKey}
          day={day}
          refreshKey={refreshKey}
          focusNonce={focusNonce}
          optimisticWeightKg={optimisticWeightKg}
          replayOverride={replayOverride}
          replayLoading={replayLoading}
          replayMissing={replayMissing}
          replayError={replayError}
        />

        <QuickActionsRow />

        <View style={styles.grid}>
          {COMMAND_CENTER_MODULES.map((m) => {
            const disabled = isModuleDisabled(m.id);
            const badge = getModuleBadge(m.id);

            return (
              <ModuleTile
                key={m.id}
                id={m.id}
                title={m.title}
                {...(m.subtitle ? { subtitle: m.subtitle } : {})}
                {...(badge ? { badge } : {})}
                disabled={disabled}
                onPress={() => {
                  if (!disabled) router.push(m.href);
                }}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16, gap: 18 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCol: { flex: 1 },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  gearPressed: { opacity: 0.8 },
  gearText: { fontSize: 18 },

  replayWrap: { borderRadius: 16, padding: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E5E7EB" },
  replayTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  replayTitle: { fontSize: 13, fontWeight: "900", color: "#111827" },
  replayHint: { marginTop: 8, fontSize: 12, fontWeight: "700", color: "#374151", lineHeight: 16 },

  replayToggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  replayToggleOn: { backgroundColor: "#111827" },
  replayToggleOff: { backgroundColor: "#E5E7EB" },
  replayToggleText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  replayRow: { marginTop: 10, flexDirection: "row", gap: 10 },
  replayButton: { flex: 1, backgroundColor: "#111827", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  replayButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  replayButtonSecondary: {
    width: 90,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  replayButtonSecondaryText: { color: "#111827", fontSize: 12, fontWeight: "900" },

  replayInputRow: { marginTop: 10, gap: 6 },
  replayInputLabel: { fontSize: 12, fontWeight: "900", color: "#111827" },
  replayInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  replayList: { marginTop: 10, gap: 8 },
  replayListHint: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  replayListItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  replayListItemSelected: { borderColor: "#111827" },
  replayListRunId: { fontSize: 12, fontWeight: "900", color: "#111827" },
  replayListMeta: { marginTop: 4, fontSize: 11, fontWeight: "700", color: "#374151" },

  replayStatusRow: { marginTop: 10 },
  replayStatusText: { fontSize: 12, fontWeight: "800", color: "#374151", lineHeight: 16 },

  statusCard: { borderRadius: 16, padding: 14, gap: 8 },
  statusTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  statusDay: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  statusTitle: { fontSize: 16, fontWeight: "800" },
  statusSubtitle: { fontSize: 13, color: "#374151", lineHeight: 18 },
  summaryWrap: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.08)" },
  summaryText: { fontSize: 12, color: "#111827", fontWeight: "700", lineHeight: 16 },

  devOverlay: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.10)" },
  devOverlayTitle: { fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 },
  devOverlayLine: { fontSize: 12, fontWeight: "700", color: "#374151", lineHeight: 16 },

  quickRow: { flexDirection: "row", gap: 12 },
  quickButton: { flex: 1, backgroundColor: "#111827", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14 },
  quickButtonTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", letterSpacing: 0.2 },
  quickButtonSubtitle: { color: "#D1D5DB", fontSize: 12, fontWeight: "700", marginTop: 6 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
