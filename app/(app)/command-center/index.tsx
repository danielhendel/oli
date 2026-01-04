// app/(app)/command-center/index.tsx
import { ScrollView, View, StyleSheet, Pressable, Text } from "react-native";
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
      <Text style={styles.devOverlayLine}>Facts:     {formatIsoToHms(props.factsAt)}</Text>
      <Text style={styles.devOverlayLine}>Context:   {formatIsoToHms(props.contextAt)}</Text>
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

function DataStatusCard(props: {
  day: string;
  refreshKey: string | null;
  focusNonce: number;
  optimisticWeightKg: number | null;
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

  const latestEventAt = dayTruth.status === "ready" ? dayTruth.data.latestCanonicalEventAt : null;
  const hasEvents = dayTruth.status === "ready" && dayTruth.data.eventsCount > 0;

  const factsComputedAt =
    facts.status === "ready" ? facts.data.meta?.computedAt ?? facts.data.computedAt ?? null : null;
  const ctxComputedAt = ctx.status === "ready" ? ctx.data.meta?.computedAt ?? ctx.data.computedAt ?? null : null;

  const factsFresh = isFreshComputedAt({ computedAtIso: factsComputedAt, latestEventAtIso: latestEventAt });
  const ctxFresh = isFreshComputedAt({ computedAtIso: ctxComputedAt, latestEventAtIso: latestEventAt });

  const factsPipelineVersion = facts.status === "ready" ? facts.data.meta?.pipelineVersion ?? null : null;
  const ctxPipelineVersion = ctx.status === "ready" ? ctx.data.meta?.pipelineVersion ?? null : null;

  const factsVersionOk = isCompatiblePipelineVersion({
    pipelineVersion: factsPipelineVersion,
    expectedPipelineVersion: PIPELINE_VERSION,
  });

  const ctxVersionOk = isCompatiblePipelineVersion({
    pipelineVersion: ctxPipelineVersion,
    expectedPipelineVersion: PIPELINE_VERSION,
  });

  const derivedReady = hasEvents ? factsFresh && ctxFresh && factsVersionOk && ctxVersionOk : false;

  const anyLoading =
    dayTruth.status === "loading" ||
    facts.status === "loading" ||
    insights.status === "loading" ||
    ctx.status === "loading";

  const anyError =
    dayTruth.status === "error" ||
    facts.status === "error" ||
    insights.status === "error" ||
    ctx.status === "error";

  const currentWeightKg = facts.status === "ready" ? facts.data.body?.weightKg ?? null : null;

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
    title = "Checking your data…";
    subtitle = "Syncing today’s canonical events and derived truth.";
  } else if (anyError) {
    tone = "danger";
    title = "Couldn’t load your data";
    const msg =
      (dayTruth.status === "error" ? dayTruth.error : null) ??
      (facts.status === "error" ? facts.error : null) ??
      (insights.status === "error" ? insights.error : null) ??
      (ctx.status === "error" ? ctx.error : null) ??
      "Please try again.";
    subtitle = msg;
  } else if (dayTruth.status === "ready" && !hasEvents) {
    tone = "warning";
    title = "No data yet for today";
    subtitle = "Log your first event (weight, workout, sleep, steps) to start building your Health OS.";
  } else if (!derivedReady) {
    tone = "neutral";
    title = "Computing today…";
    subtitle = "Waiting for derived truth to catch up to canonical events.";
  } else if (derivedReady) {
    tone = "success";
    title = "Today is ready";
    subtitle = ["Events ✓", "Facts ✓", "Context ✓"].join("  •  ");
  }

  const optimistic = typeof props.optimisticWeightKg === "number" ? props.optimisticWeightKg : null;

  // ✅ If we're in an active refresh and the facts weight doesn't yet match the optimistic weight,
  // show optimistic immediately even if day-truth hasn't advanced yet.
  const eps = 0.01;
  const factsMatchOptimistic =
    typeof currentWeightKg === "number" && optimistic !== null && Math.abs(currentWeightKg - optimistic) < eps;

  const inRefreshWindow = props.refreshKey !== null && optimistic !== null && !factsMatchOptimistic;

  const shouldPreferOptimisticWeight =
    optimistic !== null &&
    (inRefreshWindow || !factsFresh || typeof currentWeightKg !== "number");

  const factsSummary =
    facts.status === "ready"
      ? {
          ...(typeof facts.data.activity?.steps === "number" ? { steps: facts.data.activity.steps } : {}),
          ...(typeof facts.data.sleep?.totalMinutes === "number" ? { sleepMin: facts.data.sleep.totalMinutes } : {}),
          ...(!shouldPreferOptimisticWeight && typeof facts.data.body?.weightKg === "number"
            ? { weightKg: facts.data.body.weightKg }
            : {}),
        }
      : null;

  const isSyncingOptimistic = shouldPreferOptimisticWeight && optimistic !== null && hasEvents;

  const summary = formatTodaySummary({
    ...(factsSummary && Object.keys(factsSummary).length > 0 ? { facts: factsSummary } : {}),
    ...(insights.status === "ready" ? { insightsCount: insights.data.count } : {}),
    ...(optimistic !== null ? { optimistic: { weightKg: optimistic } } : {}),
    ...(isSyncingOptimistic ? { isSyncingOptimistic: true } : {}),
  });

  const canonicalAt = dayTruth.status === "ready" ? dayTruth.data.latestCanonicalEventAt : null;

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

        <DataStatusCard
          key={statusCardKey}
          day={day}
          refreshKey={refreshKey}
          focusNonce={focusNonce}
          optimisticWeightKg={optimisticWeightKg}
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
