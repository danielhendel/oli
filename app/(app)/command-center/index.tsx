// app/(app)/command-center/index.tsx
import { ScrollView, View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
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
import { subscribeRefresh } from "@/lib/navigation/refreshBus";

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
}): string {
  const parts: string[] = [];

  if (typeof input.facts?.steps === "number") parts.push(`${input.facts.steps.toLocaleString()} steps`);
  if (typeof input.facts?.sleepMin === "number") parts.push(`${Math.round(input.facts.sleepMin)} min sleep`);
  if (typeof input.facts?.weightKg === "number") parts.push(`${input.facts.weightKg.toFixed(1)} kg`);
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

function DataStatusCard(props: { day: string; refreshKey: string | null; focusNonce: number }) {
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

  const isReady = hasEvents ? factsFresh && ctxFresh && factsVersionOk && ctxVersionOk : false;

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

  const hasAnyFact =
    facts.status === "ready" &&
    (typeof facts.data.activity?.steps === "number" ||
      typeof facts.data.sleep?.totalMinutes === "number" ||
      typeof facts.data.body?.weightKg === "number");

  const hasAnySignal = hasAnyFact || (insights.status === "ready" && insights.data.count > 0) || ctx.status === "ready";

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const kickRefetch = useCallback(
    (cacheBust?: string) => {
      const opts = cacheBust ? { cacheBust } : undefined; // exactOptionalPropertyTypes-safe
      void refetchDayTruth(opts);
      void refetchFacts(opts);
      void refetchInsights(opts);
      void refetchCtx(opts);
    },
    [refetchDayTruth, refetchFacts, refetchInsights, refetchCtx],
  );

  // Always refresh on focus; if refreshKey arrives (from bus), poll briefly.
  useEffect(() => {
    kickRefetch();

    const rk = props.refreshKey;
    if (!rk) return;

    if (lastRefreshKey.current === rk) return;
    lastRefreshKey.current = rk;

    kickRefetch(rk);

    stopPolling();
    pollCount.current = 0;

    pollTimer.current = setInterval(() => {
      pollCount.current += 1;
      kickRefetch(rk);
      if (pollCount.current >= 12) stopPolling();
    }, 400);

    return () => stopPolling();
  }, [props.focusNonce, props.refreshKey, kickRefetch, stopPolling]);

  useEffect(() => {
    if (isReady) stopPolling();
  }, [isReady, stopPolling]);

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
  } else if (!factsFresh || !ctxFresh || !factsVersionOk || !ctxVersionOk) {
    tone = "neutral";
    title = "Computing today…";
    const parts: string[] = [];
    parts.push("Events ✓");
    parts.push(factsFresh ? "Facts ✓" : "Facts computing…");
    parts.push(ctxFresh ? "Context ✓" : "Context computing…");
    if (factsFresh && !factsVersionOk) parts.push("Facts upgrading…");
    if (ctxFresh && !ctxVersionOk) parts.push("Context upgrading…");
    subtitle = parts.join("  •  ");
  } else if (isReady) {
    tone = "success";
    title = "Today is ready";
    subtitle = ["Events ✓", "Facts ✓", "Context ✓"].join("  •  ");
  } else if (hasAnySignal) {
    tone = "neutral";
    title = "Computing today…";
    subtitle = "Waiting for derived truth to catch up to canonical events.";
  } else {
    tone = "warning";
    title = "No data yet for today";
    subtitle = "Log your first event (weight, workout, sleep, steps) to start building your Health OS.";
  }

  const factsSummary =
    facts.status === "ready"
      ? {
          ...(typeof facts.data.activity?.steps === "number" ? { steps: facts.data.activity.steps } : {}),
          ...(typeof facts.data.sleep?.totalMinutes === "number" ? { sleepMin: facts.data.sleep.totalMinutes } : {}),
          ...(typeof facts.data.body?.weightKg === "number" ? { weightKg: facts.data.body.weightKg } : {}),
        }
      : null;

  const summary = formatTodaySummary({
    ...(factsSummary && Object.keys(factsSummary).length > 0 ? { facts: factsSummary } : {}),
    ...(insights.status === "ready" ? { insightsCount: insights.data.count } : {}),
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

  const [focusNonce, setFocusNonce] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusNonce((n) => n + 1);
      return undefined;
    }, []),
  );

  // Refresh key delivered via refreshBus (deterministic).
  const [refreshKey, setRefreshKey] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeRefresh(({ topic, key }) => {
      if (topic !== "commandCenter") return;
      setRefreshKey(key);
    });
    return unsub;
  }, []);

  // Hard guarantee: remount status card when refreshKey changes
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

        <DataStatusCard key={statusCardKey} day={day} refreshKey={refreshKey} focusNonce={focusNonce} />
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
  container: {
    padding: 16,
    gap: 18,
  },
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

  statusCard: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  statusDay: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusSubtitle: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  summaryWrap: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  summaryText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
    lineHeight: 16,
  },

  devOverlay: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.10)",
  },
  devOverlayTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  devOverlayLine: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 16,
  },

  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  quickButtonTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  quickButtonSubtitle: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
