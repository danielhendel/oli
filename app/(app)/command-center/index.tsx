// app/(app)/command-center/index.tsx
import { ScrollView, View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { ModuleTile } from "@/lib/ui/ModuleTile";
import { CommandCenterHeader } from "@/lib/ui/CommandCenterHeader";
import { COMMAND_CENTER_MODULES } from "@/lib/modules/commandCenterModules";
import { getModuleBadge, isModuleDisabled } from "@/lib/modules/commandCenterReadiness";
import { ProvenanceRow } from "@/lib/ui/ProvenanceRow";

import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { useIntelligenceContext } from "@/lib/data/useIntelligenceContext";
import { useDayTruth } from "@/lib/data/useDayTruth";

import { isCompatiblePipelineVersion } from "@/lib/data/readiness";
import { resolveReadiness } from "@/lib/data/resolveReadiness";
import { PIPELINE_VERSION } from "@/lib/pipeline/version";
import { subscribeRefresh, consumeRefresh } from "@/lib/navigation/refreshBus";

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

type ReplayUiState =
  | { enabled: false }
  | {
      enabled: true;
      isOpen: boolean;
      runs: DerivedLedgerRunsResponseDto | null;
      runsLoading: boolean;
      runsError: string | null;
      selectedRunId: string | null;
      replay: DerivedLedgerReplayResponseDto | null;
      replayLoading: boolean;
      replayError: string | null;
      replayMissing: boolean;
    };

function useReplayUi(dayKey: string): ReplayUiState {
  const params = useLocalSearchParams<{
    replay?: string;
    rid?: string;
  }>();

  const enabled = __DEV__ && (params.replay === "1" || params.replay === "true");

  const [isOpen, setIsOpen] = useState(false);
  const selectedRunIdParam = typeof params.rid === "string" ? params.rid : null;

  const runsState = useDerivedLedgerRuns(dayKey, { enabled });

  const replayArgs =
    selectedRunIdParam !== null ? ({ day: dayKey, runId: selectedRunIdParam } as const) : ({ day: dayKey } as const);

  const replayState = useDerivedLedgerReplay(replayArgs, { enabled: enabled && Boolean(selectedRunIdParam) });

  useEffect(() => {
    if (!enabled) return;
    setIsOpen(true);
  }, [enabled]);

  if (!enabled) return { enabled: false };

  return {
    enabled: true,
    isOpen,
    runs: runsState.status === "ready" ? runsState.data : null,
    runsLoading: runsState.status === "loading",
    runsError: runsState.status === "error" ? runsState.error : null,
    selectedRunId: selectedRunIdParam,
    replay: replayState.status === "ready" ? replayState.data : null,
    replayLoading: replayState.status === "loading",
    replayError: replayState.status === "error" ? replayState.error : null,
    replayMissing: replayState.status === "missing",
  };
}

function ReplayPanel(props: {
  state: Extract<ReplayUiState, { enabled: true }>;
  onClose: () => void;
  onPickRun: (runId: string) => void;
}) {
  const s = props.state;

  if (!s.isOpen) return null;

  const items = s.runs?.runs ?? [];

  return (
    <View style={styles.replayPanel}>
      <View style={styles.replayPanelHeaderRow}>
        <Text style={styles.replayPanelTitle}>Replay (dev)</Text>
        <Pressable onPress={props.onClose} style={styles.replayCloseBtn}>
          <Text style={styles.replayCloseBtnText}>Close</Text>
        </Pressable>
      </View>

      {s.runsLoading ? <Text style={styles.replayPanelMuted}>Loading runs…</Text> : null}
      {s.runsError ? <Text style={styles.replayPanelError}>Runs error: {s.runsError}</Text> : null}

      {items.length ? (
        <View style={styles.replayRunsList}>
          {items.map((r) => (
            <Pressable
              key={r.runId}
              onPress={() => props.onPickRun(r.runId)}
              style={[styles.replayRunRow, s.selectedRunId === r.runId ? styles.replayRunRowSelected : null]}
            >
              <Text style={styles.replayRunId} numberOfLines={1}>
                {r.runId}
              </Text>
              <Text style={styles.replayRunMeta} numberOfLines={1}>
                {r.pipelineVersion ? `PV ${r.pipelineVersion}` : "PV —"} • {formatIsoToHms(r.createdAt)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.replayPanelMuted}>No derived ledger runs found.</Text>
      )}

      <View style={styles.replayDivider} />

      {s.selectedRunId ? (
        <View>
          <Text style={styles.replayPanelMuted}>Selected: {s.selectedRunId}</Text>
          {s.replayLoading ? <Text style={styles.replayPanelMuted}>Replaying…</Text> : null}
          {s.replayError ? <Text style={styles.replayPanelError}>Replay error: {s.replayError}</Text> : null}
          {s.replayMissing ? <Text style={styles.replayPanelMuted}>Replay missing snapshots for this run.</Text> : null}
        </View>
      ) : (
        <Text style={styles.replayPanelMuted}>Pick a run to overlay snapshots.</Text>
      )}
    </View>
  );
}

function useReplayOverride(dayKey: string): {
  replayOverride: DerivedLedgerReplayResponseDto | null;
  replayLoading: boolean;
  replayError: string | null;
  replayMissing: boolean;
} {
  const ui = useReplayUi(dayKey);

  if (!ui.enabled) return { replayOverride: null, replayLoading: false, replayError: null, replayMissing: false };

  return {
    replayOverride: ui.replay,
    replayLoading: ui.replayLoading,
    replayError: ui.replayError,
    replayMissing: ui.replayMissing,
  };
}

type Props = {
  focusNonce?: number;
  refreshKey?: string | null;
  optimisticWeightKg?: number | null;

  replayOverride?: DerivedLedgerReplayResponseDto | null;
  replayLoading?: boolean;
  replayError?: string | null;
  replayMissing?: boolean;
};

function QuickActionsRow() {
  const router = useRouter();

  return (
    <View style={styles.quickActionsRow}>
      <Pressable onPress={() => router.push("/(app)/body/weight")} style={styles.quickActionBtn}>
        <Text style={styles.quickActionTitle}>Log weight</Text>
        <Text style={styles.quickActionSubtitle}>Fast entry</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(app)/nutrition")} style={styles.quickActionBtn}>
        <Text style={styles.quickActionTitle}>Nutrition</Text>
        <Text style={styles.quickActionSubtitle}>Overview</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(app)/workouts")} style={styles.quickActionBtn}>
        <Text style={styles.quickActionTitle}>Training</Text>
        <Text style={styles.quickActionSubtitle}>Overview</Text>
      </Pressable>
    </View>
  );
}

export default function CommandCenterScreen(props: Props) {
  const router = useRouter();

  const dayKey = useMemo(() => getTodayDayKey(), []);

  const dayTruth = useDayTruth(dayKey);
  const facts = useDailyFacts(dayKey);
  const insights = useInsights(dayKey);
  const ctx = useIntelligenceContext(dayKey);

  const { replayOverride, replayLoading, replayError, replayMissing } = useReplayOverride(dayKey);

  const replay = props.replayOverride ?? replayOverride ?? null;
  const replayModeActive =
    Boolean(replay) ||
    Boolean(props.replayLoading ?? replayLoading) ||
    Boolean(props.replayMissing ?? replayMissing) ||
    Boolean(props.replayError ?? replayError);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const lastRefreshKey = useRef<string | null>(null);

  const baselineCanonicalAt = useRef<string | null>(null);
  const baselineFactsAt = useRef<string | null>(null);
  const baselineCtxAt = useRef<string | null>(null);

  const latestEventAtLive = dayTruth.status === "ready" ? dayTruth.data.latestCanonicalEventAt : null;
  const hasEventsLive = dayTruth.status === "ready" && dayTruth.data.eventsCount > 0;

  const latestEventAt = replayModeActive ? replay?.latestCanonicalEventAt ?? null : latestEventAtLive;
  const hasEvents = replayModeActive ? Boolean(replay?.latestCanonicalEventAt) : hasEventsLive;

  const eventsCount = dayTruth.status === "ready" ? dayTruth.data.eventsCount : null;

  const factsDoc = replayModeActive ? replay?.dailyFacts : facts.status === "ready" ? facts.data : null;
  const ctxDoc = replayModeActive ? replay?.intelligenceContext : ctx.status === "ready" ? ctx.data : null;
  const insightsDoc = replayModeActive ? replay?.insights : insights.status === "ready" ? insights.data : null;

  const factsComputedAt =
    factsDoc && typeof (factsDoc as unknown as { meta?: { computedAt?: unknown } })?.meta?.computedAt === "string"
      ? (factsDoc as unknown as { meta: { computedAt: string } }).meta.computedAt
      : null;

  const ctxComputedAt =
    ctxDoc && typeof (ctxDoc as unknown as { meta?: { computedAt?: unknown } })?.meta?.computedAt === "string"
      ? (ctxDoc as unknown as { meta: { computedAt: string } }).meta.computedAt
      : null;

  const factsPipelineVersion =
    factsDoc && typeof (factsDoc as unknown as { meta?: { pipelineVersion?: unknown } })?.meta?.pipelineVersion === "number"
      ? (factsDoc as unknown as { meta: { pipelineVersion: number } }).meta.pipelineVersion
      : null;

  const ctxPipelineVersion =
    ctxDoc && typeof (ctxDoc as unknown as { meta?: { pipelineVersion?: unknown } })?.meta?.pipelineVersion === "number"
      ? (ctxDoc as unknown as { meta: { pipelineVersion: number } }).meta.pipelineVersion
      : null;

  // Minimal, deterministic provenance for the “today metric surface”.
  // If facts/context disagree, we show facts as the primary computedAt/PV and
  // still show the dev overlay for deeper debugging.
  const computedAtForUi = factsComputedAt ?? ctxComputedAt ?? null;
  const pipelineVersionForUi = factsPipelineVersion ?? ctxPipelineVersion ?? null;

  const factsVersionOk = isCompatiblePipelineVersion({
    pipelineVersion: factsPipelineVersion,
    expectedPipelineVersion: PIPELINE_VERSION,
  });

  const ctxVersionOk = isCompatiblePipelineVersion({
    pipelineVersion: ctxPipelineVersion,
    expectedPipelineVersion: PIPELINE_VERSION,
  });

  const factsReadiness = replayModeActive
    ? undefined
    : resolveReadiness({
        network: facts.status === "loading" ? "loading" : facts.status === "error" ? "error" : "ok",
        zodValid: facts.status === "ready" || facts.status === "missing",
        eventsCount,
        computedAtIso: factsComputedAt,
        latestCanonicalEventAtIso: latestEventAt,
        pipelineVersion: factsPipelineVersion,
        expectedPipelineVersion: PIPELINE_VERSION,
      });

  const ctxReadiness = replayModeActive
    ? undefined
    : resolveReadiness({
        network: ctx.status === "loading" ? "loading" : ctx.status === "error" ? "error" : "ok",
        zodValid: ctx.status === "ready" || ctx.status === "missing",
        eventsCount,
        computedAtIso: ctxComputedAt,
        latestCanonicalEventAtIso: latestEventAt,
        pipelineVersion: ctxPipelineVersion,
        expectedPipelineVersion: PIPELINE_VERSION,
      });

  const factsFresh = replayModeActive ? Boolean(factsDoc) : factsReadiness?.state === "ready";
  const derivedReadyLive = factsReadiness?.state === "ready" && ctxReadiness?.state === "ready";
  const derivedReady = replayModeActive ? Boolean(factsDoc) && Boolean(ctxDoc) && factsVersionOk && ctxVersionOk : derivedReadyLive;

  const anyLoading =
    replayModeActive
      ? Boolean(props.replayLoading ?? replayLoading) || dayTruth.status === "loading"
      : dayTruth.status === "loading" || facts.status === "loading" || insights.status === "loading" || ctx.status === "loading";

  const anyError =
    replayModeActive
      ? Boolean(props.replayError ?? replayError) || dayTruth.status === "error"
      : dayTruth.status === "error" || facts.status === "error" || insights.status === "error" || ctx.status === "error";

  const dataReadinessState =
    replayModeActive
      ? anyLoading
        ? "loading"
        : anyError
          ? "invalid"
          : hasEvents
            ? derivedReady
              ? "ready"
              : "partial"
            : "empty"
      : factsReadiness && ctxReadiness
        ? factsReadiness.state === "invalid" || ctxReadiness.state === "invalid"
          ? "invalid"
          : factsReadiness.state === "partial" || ctxReadiness.state === "partial"
            ? "partial"
            : factsReadiness.state === "empty" || ctxReadiness.state === "empty"
              ? "empty"
              : factsReadiness.state === "loading" || ctxReadiness.state === "loading"
                ? "loading"
                : "ready"
        : "loading";

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const kickRefetch = useCallback(
    (cacheBust?: string) => {
      const opts = cacheBust ? { cacheBust } : undefined;
      void dayTruth.refetch(opts);
      void facts.refetch(opts);
      void insights.refetch(opts);
      void ctx.refetch(opts);
    },
    [dayTruth.refetch, facts.refetch, insights.refetch, ctx.refetch],
  );

  useEffect(() => {
    kickRefetch();
  }, [props.focusNonce, kickRefetch]);

  useEffect(() => {
    const rk = props.refreshKey;
    if (!rk) return;

    if (lastRefreshKey.current === rk) return;
    lastRefreshKey.current = rk;

    baselineCanonicalAt.current = latestEventAt ?? null;
    baselineFactsAt.current = factsComputedAt ?? null;
    baselineCtxAt.current = ctxComputedAt ?? null;

    stopPolling();
    pollCount.current = 0;

    kickRefetch(rk);

    pollTimer.current = setInterval(() => {
      pollCount.current += 1;
      kickRefetch(rk);
      if (pollCount.current >= 6) stopPolling();
    }, 1500);

    return () => stopPolling();
  }, [props.refreshKey, latestEventAt, factsComputedAt, ctxComputedAt, stopPolling, kickRefetch]);

  useEffect(() => {
    if (!props.refreshKey) return;

    const canonicalAdvanced = baselineCanonicalAt.current && latestEventAt ? latestEventAt !== baselineCanonicalAt.current : false;
    const factsAdvanced = baselineFactsAt.current && factsComputedAt ? factsComputedAt !== baselineFactsAt.current : false;
    const ctxAdvanced = baselineCtxAt.current && ctxComputedAt ? ctxComputedAt !== baselineCtxAt.current : false;

    const pipelineCaughtUp = canonicalAdvanced && derivedReady && factsAdvanced && ctxAdvanced;
    if (pipelineCaughtUp) stopPolling();
  }, [props.refreshKey, latestEventAt, factsComputedAt, ctxComputedAt, derivedReady, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeRefresh((ev) => {
        if (ev.topic !== "commandCenter") return;
        consumeRefresh(ev.topic, ev.key);
        kickRefetch(ev.key);
      });
      return () => unsubscribe();
    }, [kickRefetch]),
  );

  let tone: StatusTone = "neutral";
  let title = "Status";
  let subtitle = "—";

  if (anyError) {
    tone = "danger";
    title = "Sync error";
    subtitle = "We couldn’t load today. Check your connection and try again.";
  } else if (anyLoading) {
    tone = "neutral";
    title = "Loading…";
    subtitle = "Fetching today’s data.";
  } else if (!hasEvents) {
    tone = "warning";
    title = "No data yet for today";
    subtitle = "Log your first event (weight, workout, sleep, steps) to start building your Health OS.";
  } else if (!derivedReady) {
    tone = "neutral";
    title = replayModeActive ? "Replay incomplete" : "Computing today…";
    subtitle = replayModeActive
      ? "This replay run does not include all required snapshots (facts/context) or pipeline versions mismatch."
      : "Waiting for derived truth to catch up to canonical events.";
  } else {
    tone = "success";
    title = replayModeActive ? "Replay is ready" : "Today is ready";
    subtitle = ["Events ✓", "Facts ✓", "Context ✓"].join("  •  ");
  }

  const eps = 0.01;
  const currentWeightKg =
    factsDoc && typeof (factsDoc as unknown as { body?: { weightKg?: unknown } })?.body?.weightKg === "number"
      ? (factsDoc as unknown as { body: { weightKg: number } }).body.weightKg
      : null;

  const optimistic = typeof props.optimisticWeightKg === "number" ? props.optimisticWeightKg : null;

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

  const insightsCount =
    insightsDoc && typeof (insightsDoc as unknown as { insights?: unknown[] })?.insights?.length === "number"
      ? (insightsDoc as unknown as { insights: unknown[] }).insights.length
      : null;

  const summaryArgs: Parameters<typeof formatTodaySummary>[0] = {};
  if (factsSummary) summaryArgs.facts = factsSummary;
  if (typeof insightsCount === "number") summaryArgs.insightsCount = insightsCount;
  if (shouldPreferOptimisticWeight && optimistic !== null) summaryArgs.optimistic = { weightKg: optimistic };
  if (shouldPreferOptimisticWeight) summaryArgs.isSyncingOptimistic = true;

  const todaySummary = formatTodaySummary(summaryArgs);

  const replayUi = useReplayUi(dayKey);

  const onPickRun = useCallback(
    (runId: string) => {
      router.setParams({ replay: "1", rid: runId });
    },
    [router],
  );

  const onCloseReplay = useCallback(() => {
    router.setParams({ replay: undefined, rid: undefined });
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <CommandCenterHeader title="Command Center" subtitle={todaySummary} />

        {replayUi.enabled ? <ReplayPanel state={replayUi} onClose={onCloseReplay} onPickRun={onPickRun} /> : null}

        <View style={[styles.statusCard, { backgroundColor: toneBg[tone] }]}>
          <Text style={[styles.statusLabel, { color: toneColor[tone] }]}>{toneLabel[tone]}</Text>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusSubtitle}>{subtitle}</Text>
        </View>

        {/* Phase 1 §4.2: Provenance visible without dev tools */}
        <ProvenanceRow
          label={replayModeActive ? "Replay" : "Today"}
          computedAtIso={computedAtForUi}
          pipelineVersion={pipelineVersionForUi}
          latestCanonicalEventAtIso={latestEventAt}
          eventsCount={eventsCount}
        />

        <DevPipelineOverlay
          canonicalAt={latestEventAt}
          factsAt={factsComputedAt}
          contextAt={ctxComputedAt}
          factsPv={factsPipelineVersion}
          ctxPv={ctxPipelineVersion}
        />

        <QuickActionsRow />

        <View style={styles.grid}>
          {COMMAND_CENTER_MODULES.map((m) => {
            const disabled = isModuleDisabled(m.id, dataReadinessState);
            const badge = getModuleBadge(m.id, dataReadinessState);

            return (
              <ModuleTile
                key={m.id}
                id={m.id}
                title={m.title}
                {...(m.subtitle ? { subtitle: m.subtitle } : {})}
                {...(badge ? { badge } : {})}
                disabled={disabled}
                onPress={() => {
                  if (disabled) return;
                  router.push(m.href);
                }}
              />
            );
          })}
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug</Text>
          <Text style={styles.debugLine}>Day: {dayKey}</Text>
          <Text style={styles.debugLine}>Ready: {String(derivedReady)}</Text>
          <Text style={styles.debugLine}>Data state: {dataReadinessState}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 16, paddingBottom: 40 },

  statusCard: {
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  statusLabel: { fontSize: 12, fontWeight: "700" },
  statusTitle: { fontSize: 18, fontWeight: "800", marginTop: 6, color: "#111" },
  statusSubtitle: { fontSize: 13, marginTop: 6, color: "#333" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },

  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F2F2F7",
  },
  quickActionTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  quickActionSubtitle: { fontSize: 12, color: "#555", marginTop: 2 },

  debugCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8F8FA",
  },
  debugTitle: { fontSize: 13, fontWeight: "800", color: "#111", marginBottom: 6 },
  debugLine: { fontSize: 12, color: "#444" },

  devOverlay: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#F7F7FF",
    borderWidth: 1,
    borderColor: "#E3E3FF",
    marginBottom: 10,
  },
  devOverlayTitle: { fontSize: 12, fontWeight: "800", marginBottom: 6, color: "#111" },
  devOverlayLine: { fontSize: 12, color: "#333" },

  replayPanel: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DDE8FF",
    marginTop: 10,
    marginBottom: 6,
  },
  replayPanelHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  replayPanelTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  replayCloseBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#E9F1FF" },
  replayCloseBtnText: { fontSize: 12, fontWeight: "800" },
  replayPanelMuted: { fontSize: 12, color: "#445", marginTop: 6 },
  replayPanelError: { fontSize: 12, color: "#B00020", marginTop: 6 },

  replayRunsList: { marginTop: 10, gap: 8 },
  replayRunRow: { padding: 10, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6EEFF" },
  replayRunRowSelected: { borderColor: "#8FB1FF" },
  replayRunId: { fontSize: 12, fontWeight: "900", color: "#111" },
  replayRunMeta: { fontSize: 12, color: "#445", marginTop: 3 },

  replayDivider: { height: 1, backgroundColor: "#DDE8FF", marginVertical: 10 },
});