// app/(app)/body/weight.tsx — Body Composition: nav header, hero, stat tiles, chart (fail-closed).
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState, EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";
import { WeightLogModal } from "@/lib/ui/WeightLogModal";

import { useAuth } from "@/lib/auth/AuthProvider";
import { postWithingsPullNow } from "@/lib/api/withings";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { useWeightSeries, type WeightRangeKey, type WeightPoint } from "@/lib/data/useWeightSeries";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { getWithingsLastCheckedAt, setWithingsLastCheckedAt } from "@/lib/integrations/withings/storage";
import { shouldRun, nowIso } from "@/lib/sync/throttle";

/** Dev-only: audit weight window for range; mirrors chart robust Y-domain. No PII; bounded first/last 10. */
function auditWeightWindowDevOnly(params: {
  range: WeightRangeKey;
  unit: "kg" | "lb";
  points: WeightPoint[];
}): void {
  if (!__DEV__ || process.env.NODE_ENV === "test") return;
  const { range, unit, points } = params;
  const sorted = [...points].sort(
    (a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt),
  );
  const n = sorted.length;
  if (n === 0) return;
  const minKg = Math.min(...sorted.map((p) => p.weightKg));
  const maxKg = Math.max(...sorted.map((p) => p.weightKg));
  const min = unit === "lb" ? minKg * LBS_PER_KG : minKg;
  const max = unit === "lb" ? maxKg * LBS_PER_KG : maxKg;

  let displayMinKg: number;
  let displayMaxKg: number;
  let outlierCount: number;
  let outliersBySource: Record<string, number>;

  if (n < 3) {
    displayMinKg = minKg;
    displayMaxKg = maxKg;
    outlierCount = 0;
    outliersBySource = {};
  } else {
    const weights = sorted.map((p) => p.weightKg).sort((a, b) => a - b);
    const p05 = weights[Math.floor((n - 1) * 0.05)] ?? minKg;
    const p95 = weights[Math.floor((n - 1) * 0.95)] ?? maxKg;
    const rangeW = p95 - p05 || 0.1;
    const padding = 0.02 * rangeW;
    displayMinKg = p05 - padding;
    displayMaxKg = p95 + padding;
    const outliers = sorted.filter(
      (p) => p.weightKg < displayMinKg || p.weightKg > displayMaxKg,
    );
    outlierCount = outliers.length;
    outliersBySource = {};
    for (const p of outliers) {
      const sid = p.sourceId?.trim() ? p.sourceId : "—";
      outliersBySource[sid] = (outliersBySource[sid] ?? 0) + 1;
    }
  }

  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  const first10 = sorted.slice(0, 10).map((p) => ({
    observedAt: p.observedAt,
    weightKg: round3(p.weightKg),
    sourceId: p.sourceId?.trim() ? p.sourceId : "—",
  }));
  const last10 = sorted.slice(-10).map((p) => ({
    observedAt: p.observedAt,
    weightKg: round3(p.weightKg),
    sourceId: p.sourceId?.trim() ? p.sourceId : "—",
  }));

  console.log(
    "[WEIGHT_RANGE_AUDIT]",
    JSON.stringify({
      range,
      unit,
      points: n,
      min: round3(min),
      max: round3(max),
      robustDomain: {
        min: round3(displayMinKg),
        max: round3(displayMaxKg),
        outlierCount,
        outliersBySource,
      },
      first10,
      last10,
    }),
  );
}

const CHART_CONTAINER_HEIGHT = 200;
const SURFACE_FILL = "#E5E5EA";
const SURFACE_RADIUS = 14;

const LBS_PER_KG = 2.2046226218;
const SHELL_TITLE = "Body Composition";
const WITHINGS_AUTO_MIN_MS = 5 * 60_000;
const SHELL_SUBTITLE = "Daily weigh-ins & trends";

function formatWeight(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LBS_PER_KG : kg;
  return unit === "lb" ? v.toFixed(1) : v.toFixed(1);
}

function getRangeLabel(range: WeightRangeKey): string {
  switch (range) {
    case "7D":
      return "7-day";
    case "30D":
      return "30-day";
    case "90D":
      return "90-day";
    case "6M":
      return "6-month";
    case "1Y":
      return "12-month";
    case "3Y":
      return "3-year";
    case "5Y":
      return "5-year";
    case "All":
      return "all-time";
    default:
      return "30-day";
  }
}

/** Display-only source labels; never show tokens or secrets. */
function sourceLabel(sourceId: string): string {
  if (sourceId === "withings") return "Withings";
  if (sourceId === "manual") return "Manual";
  if (typeof sourceId === "string" && sourceId.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(sourceId))
    return sourceId;
  return "—";
}

/** Derive YYYY-MM-DD in local timezone from ISO string (for metadata display). */
function dayKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

type RangeStats = {
  changeKg: number | null;
  avgKg: number | null;
  highKg: number | null;
  lowKg: number | null;
};

/**
 * Range-based stats from points only (no smoothing). Earliest = first by dayKey ascending.
 * Change = latest weight − earliest weight in range.
 */
function computeRangeStats(
  points: WeightPoint[],
  latest: { weightKg: number; observedAt: string; sourceId: string } | null,
): RangeStats | null {
  if (points.length === 0) return null;
  const sortedByDay = [...points].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  const earliest = sortedByDay[0]!;
  const changeKg = latest ? latest.weightKg - earliest.weightKg : null;
  const sum = points.reduce((s, p) => s + p.weightKg, 0);
  const avgKg = sum / points.length;
  const weights = points.map((p) => p.weightKg);
  const highKg = Math.max(...weights);
  const lowKg = Math.min(...weights);
  return { changeKg, avgKg, highKg, lowKg };
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={styles.statTileValue}>{value}</Text>
    </View>
  );
}

export default function BodyWeightScreen() {
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState } = usePreferences();
  const withingsPresence = useWithingsPresence();
  const [range, setRange] = useState<WeightRangeKey>("1Y");
  const weightSeries = useWeightSeries(range);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [withingsModalVisible, setWithingsModalVisible] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();
  const auditKeyRef = useRef<string>("");

  type UpdateState =
    | { status: "idle" }
    | { status: "busy" }
    | { status: "success"; atMs: number; created: number; already: number }
    | { status: "error"; message: string; requestId: string | null };
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle" });
  type WithingsAutoState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "ok"; atIso: string; created: number; already: number; note: "updated" | "no_new" }
    | { status: "error"; message: string; requestId: string | null };
  const [withingsAuto, setWithingsAuto] = useState<WithingsAutoState>({ status: "idle" });
  const lastUpdateTapMs = useRef(0);
  const pullNowIdemRef = useRef<string | null>(null);
  const lastAutoRefetchMsRef = useRef<number>(0);
  const UPDATE_COOLDOWN_MS = 15000;
  const [withingsLastCheckedAt, setWithingsLastCheckedAtState] = useState<string | null>(null);

  const loadWithingsLastCheckedAt = useCallback(async () => {
    try {
      const iso = await getWithingsLastCheckedAt();
      setWithingsLastCheckedAtState(iso);
    } catch {
      setWithingsLastCheckedAtState(null);
    }
  }, []);

  const maybeAutoWithingsPullNow = useCallback(
    async (reason: "focus" | "foreground") => {
      if (!user) return;
      if (!(withingsPresence.status === "ready" && withingsPresence.data?.connected)) return;

      const last = await getWithingsLastCheckedAt().catch(() => null);
      if (!shouldRun(last, WITHINGS_AUTO_MIN_MS)) return;

      const token = await getIdToken(false);
      if (!token) return;

      setWithingsAuto({ status: "checking" });

      const atIso = nowIso();
      const idempotencyKey = `withingsPullNow:auto:${reason}:${Date.now()}`;
      const res = await postWithingsPullNow(token, {
        idempotencyKey,
        cacheBust: `autoPull:${reason}:${Date.now()}`,
      });

      if (!res.ok) {
        setWithingsAuto({ status: "error", message: res.error, requestId: res.requestId ?? null });
        return;
      }

      await setWithingsLastCheckedAt(atIso);
      setWithingsLastCheckedAtState(atIso);

      const created = res.json.eventsCreated;
      const already = res.json.eventsAlreadyExists;
      setWithingsAuto({
        status: "ok",
        atIso,
        created,
        already,
        note: created === 0 && already === 0 ? "no_new" : "updated",
      });

      void weightSeries.refetch({ cacheBust: `autoPull:${reason}:${Date.now()}` });
      void withingsPresence.refetch({ cacheBust: `autoPull:${reason}:${Date.now()}` });
    },
    [user, withingsPresence, getIdToken, weightSeries],
  );

  const maybeAutoRefetch = useCallback(
    (reason: "focus" | "foreground") => {
      const now = Date.now();
      if (now - lastAutoRefetchMsRef.current < 60_000) return;
      lastAutoRefetchMsRef.current = now;
      void weightSeries.refetch({ cacheBust: `auto:${reason}:${now}` });
      void withingsPresence.refetch({ cacheBust: `auto:${reason}:${now}` });
      void loadWithingsLastCheckedAt();
      void maybeAutoWithingsPullNow(reason);
    },
    [weightSeries, withingsPresence, loadWithingsLastCheckedAt, maybeAutoWithingsPullNow],
  );

  useEffect(() => {
    void loadWithingsLastCheckedAt();
  }, [loadWithingsLastCheckedAt]);

  useFocusEffect(
    useCallback(() => {
      maybeAutoRefetch("focus");
    }, [maybeAutoRefetch]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") maybeAutoRefetch("foreground");
    });
    return () => sub.remove();
  }, [maybeAutoRefetch]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setSettingsModalVisible(true)}
          style={styles.headerMenuBtn}
          accessibilityRole="button"
          accessibilityLabel="Weight settings"
        >
          <Text style={styles.headerMenuText}>•••</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const unit = prefState.preferences?.units?.mass ?? "lb";
  const connected =
    withingsPresence.status === "ready" && withingsPresence.data?.connected;

  // Compute before any early return so hooks below can depend on them and run unconditionally.
  const data = weightSeries.status === "ready" ? weightSeries.data : null;
  const points = data?.points ?? [];
  const latest = data?.latest ?? null;

  useEffect(() => {
    if (points.length > 0) setChartError(null);
  }, [points.length]);

  // Dev-only: one [WEIGHT_RANGE_AUDIT] per range selection when data is ready; deduplicated by ref key.
  useEffect(() => {
    if (!__DEV__ || weightSeries.status !== "ready" || points.length === 0) return;
    const key = `${range}:${unit}:${points.length}:${points[0]?.observedAt ?? "none"}:${points[points.length - 1]?.observedAt ?? "none"}`;
    if (auditKeyRef.current === key) return;
    auditKeyRef.current = key;
    auditWeightWindowDevOnly({ range, unit, points });
  }, [weightSeries.status, range, unit, points]);

  const onPressUpdate = async () => {
    if (!connected) {
      setWithingsModalVisible(true);
      return;
    }
    const now = Date.now();
    if (now - lastUpdateTapMs.current < UPDATE_COOLDOWN_MS) return;
    lastUpdateTapMs.current = now;

    if (pullNowIdemRef.current === null) {
      pullNowIdemRef.current = `withingsPullNow:${Date.now()}`;
    }
    const idempotencyKey = pullNowIdemRef.current;

    setUpdateState({ status: "busy" });

    const token = await getIdToken(false);
    if (!token) {
      setUpdateState({ status: "error", message: "No auth token", requestId: null });
      return;
    }

    const res = await postWithingsPullNow(token, {
      cacheBust: `pullNow:${now}`,
      idempotencyKey,
    });

    if (!res.ok) {
      setUpdateState({
        status: "error",
        message: res.error,
        requestId: res.requestId ?? null,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      await setWithingsLastCheckedAt(nowIso);
    } catch {
      // Best-effort; do not throw.
    }
    setWithingsLastCheckedAtState(nowIso);

    pullNowIdemRef.current = null;
    weightSeries.refetch({ cacheBust: `pullNow:${now}` });
    withingsPresence.refetch();

    setUpdateState({
      status: "success",
      atMs: Date.now(),
      created: res.json.eventsCreated,
      already: res.json.eventsAlreadyExists,
    });

    setTimeout(() => setUpdateState({ status: "idle" }), 6000);
  };

  // Fail closed: auth
  if (initializing) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <EmptyState
          title="Sign in to view weight"
          description="Sign in to see your weight data and trends."
        />
      </ModuleScreenShell>
    );
  }

  // Weight series error (contract / network)
  if (weightSeries.status === "error") {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <ErrorState
          message={weightSeries.error}
          requestId={weightSeries.requestId}
          onRetry={() => weightSeries.refetch()}
          isContractError={weightSeries.reason === "contract"}
        />
      </ModuleScreenShell>
    );
  }

  // Fail closed: contract violation (latest without points)
  if (latest != null && points.length === 0) {
    return (
      <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
        <ErrorState
          title="Data error"
          message="Weight data is inconsistent. Please try again."
          onRetry={() => weightSeries.refetch()}
        />
      </ModuleScreenShell>
    );
  }

  const rangeLabel = getRangeLabel(range);
  const rangeStats = computeRangeStats(points, latest);

  return (
    <ModuleScreenShell title={SHELL_TITLE} subtitle={SHELL_SUBTITLE} hideTitleChrome>
      {/* 1) Metric label + Withings chip + Hero */}
      <View style={styles.metricHeaderRow}>
        <Text style={styles.metricLabel}>Weight</Text>
        <Pressable
          onPress={() => setWithingsModalVisible(true)}
          style={styles.withingsChip}
          accessibilityRole="button"
          accessibilityLabel={connected ? "Withings connected" : "Manage Withings in Devices"}
        >
          <Text style={styles.withingsChipText}>Withings</Text>
          <Text style={styles.withingsChipStatus}>{connected ? "Connected" : "Manage"}</Text>
        </Pressable>
      </View>
      <View style={styles.heroCard}>
        <View style={styles.heroGrid}>
          <View style={styles.heroLeft}>
            <Text style={styles.bigNumber}>
              {latest != null
                ? `${formatWeight(latest.weightKg, unit)} `
                : "— "}
              <Text style={styles.unitLabel}>{unit}</Text>
            </Text>
            <Pressable
              onPress={onPressUpdate}
              disabled={updateState.status === "busy"}
              style={[
                styles.updatePill,
                updateState.status === "busy" && styles.updatePillDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                !connected
                  ? "Connect to update"
                  : updateState.status === "busy"
                    ? "Updating…"
                    : updateState.status === "success"
                      ? "Updated"
                      : updateState.status === "error"
                        ? "Retry"
                        : "Update"
              }
            >
              <Text style={styles.updatePillText}>
                {!connected
                  ? "Connect to update"
                  : updateState.status === "busy"
                    ? "Updating…"
                    : updateState.status === "success"
                      ? "Updated"
                      : updateState.status === "error"
                        ? "Retry"
                        : "Update"}
              </Text>
            </Pressable>
            {updateState.status === "success" && (
              <>
                <Text style={styles.updateStatusText}>
                  Updated just now
                  {updateState.created > 0 ? ` (+${updateState.created} new)` : ""}
                </Text>
                {updateState.created === 0 && updateState.already === 0 && (
                  <Text style={styles.updateStatusText}>
                    No new Withings measurements available.
                  </Text>
                )}
              </>
            )}
            {updateState.status === "error" && (
              <Text
                style={styles.updateStatusError}
                accessibilityLabel={
                  updateState.requestId
                    ? `Update failed. Request ID: ${updateState.requestId}`
                    : "Update failed"
                }
              >
                Update failed
                {updateState.requestId ? ` · Request ID: ${updateState.requestId.slice(0, 8)}` : ""}
              </Text>
            )}
            {withingsAuto.status === "checking" && (
              <Text style={styles.updateStatusText}>Checking Withings…</Text>
            )}
            {withingsAuto.status === "ok" && withingsAuto.note === "no_new" && (
              <Text style={styles.updateStatusText}>No new Withings measurements available.</Text>
            )}
            {withingsAuto.status === "error" && (
              <Text
                style={styles.updateStatusError}
                accessibilityLabel={
                  withingsAuto.requestId
                    ? `Auto-check failed. Request ID: ${withingsAuto.requestId}`
                    : "Auto-check failed"
                }
              >
                Auto-check failed
                {withingsAuto.requestId
                  ? ` · Request ID: ${withingsAuto.requestId.length <= 8 ? withingsAuto.requestId : withingsAuto.requestId.slice(0, 8)}`
                  : ""}
              </Text>
            )}
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.lastLoggedLabel}>Last logged</Text>
            {latest != null ? (
              <>
                <Text style={styles.lastLoggedValue}>
                  {new Date(latest.observedAt).toLocaleDateString()}
                </Text>
                <Text style={styles.lastLoggedValue}>
                  {new Date(latest.observedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </>
            ) : (
              <Text style={styles.lastLoggedValue}>—</Text>
            )}
            <Text style={styles.lastLoggedLabel}>Last checked</Text>
            <Text style={styles.lastLoggedValue}>
              {withingsLastCheckedAt
                ? new Date(withingsLastCheckedAt).toLocaleString()
                : "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* 2) Range selector + Chart */}
      <View style={styles.chartCard}>
        <WeightRangeSelector value={range} onChange={setRange} />
        {weightSeries.status === "partial" ? (
          <View style={[styles.chartContainer, styles.chartSkeleton]}>
            <View style={styles.skeletonBar} />
            <View style={styles.skeletonBar} />
            <View style={styles.skeletonBar} />
          </View>
        ) : points.length === 0 ? (
          <EmptyState
            title="No weight data yet"
            description="Connect a scale or log your weight to see your trend."
            explanation="Your chart will appear after your first weigh-in."
          />
        ) : chartError ? (
          <ErrorState
            title="Chart error"
            message={chartError}
            onRetry={() => {
              setChartError(null);
              weightSeries.refetch();
            }}
          />
        ) : (
          <View style={styles.chartContainer} testID="weight-trend-chart">
            <WeightTrendChart
              points={points}
              unitLabel={unit}
              formatValue={(kg) => formatWeight(kg, unit)}
              range={range}
              onChartError={setChartError}
            />
          </View>
        )}
      </View>

      {/* 3) Stat tiles (range-based) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statTilesScroll}
        style={styles.statTilesScrollView}
      >
        <StatTile
          label={`${rangeLabel} change`}
          value={
            rangeStats?.changeKg != null
              ? `${rangeStats.changeKg >= 0 ? "+" : ""}${formatWeight(rangeStats.changeKg, unit)} ${unit}`
              : "—"
          }
        />
        <StatTile
          label={`${rangeLabel} avg`}
          value={
            rangeStats?.avgKg != null
              ? `${formatWeight(rangeStats.avgKg, unit)} ${unit}`
              : "—"
          }
        />
        <StatTile
          label="High"
          value={rangeStats?.highKg != null ? `${formatWeight(rangeStats.highKg, unit)} ${unit}` : "—"}
        />
        <StatTile
          label="Low"
          value={rangeStats?.lowKg != null ? `${formatWeight(rangeStats.lowKg, unit)} ${unit}` : "—"}
        />
      </ScrollView>

      {/* 4) Manual Log CTA — hidden when Withings connected */}
      {!connected && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => setLogModalVisible(true)}
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel="Log your weight"
          >
            <Text style={styles.primaryButtonText}>Log your weight</Text>
          </Pressable>
        </View>
      )}

      {/* 5) History (unchanged) */}
      {data && (
        <HistorySection points={data.points} unit={unit} onViewMore={() => setHistoryModalVisible(true)} />
      )}

      <WeightLogModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSaved={() => {
          weightSeries.refetch();
          withingsPresence.refetch();
        }}
      />

      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsModalVisible(false)}
        accessibilityLabel="Weight settings"
      >
        <Pressable
          style={styles.settingsModalBackdrop}
          onPress={() => setSettingsModalVisible(false)}
          accessibilityLabel="Close"
        >
          <View style={styles.settingsModalContent}>
            <Text style={styles.settingsModalTitle}>Weight settings coming soon</Text>
            <Pressable
              onPress={() => setSettingsModalVisible(false)}
              style={styles.detailsCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailsModalVisible(false)}
        accessibilityLabel="Measurement Details"
      >
        <View style={styles.detailsSheet}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Measurement Details</Text>
            <Pressable
              onPress={() => setDetailsModalVisible(false)}
              style={styles.detailsCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>
          </View>
          {latest != null && (
            <View style={styles.detailsBody}>
              <Text style={styles.detailsValue}>
                {formatWeight(latest.weightKg, unit)} {unit}
              </Text>
              <Text style={styles.detailsDatetime}>
                {new Date(latest.observedAt).toLocaleString()}
              </Text>
              <Text style={styles.detailsSource}>
                {sourceLabel(latest.sourceId)}
              </Text>
              <View style={styles.detailsMeta}>
                <Text style={styles.detailsMetaLabel}>observedAt</Text>
                <Text style={styles.detailsMetaValue}>{latest.observedAt}</Text>
                <Text style={styles.detailsMetaLabel}>dayKey</Text>
                <Text style={styles.detailsMetaValue}>
                  {dayKeyFromIso(latest.observedAt)}
                </Text>
                <Text style={styles.detailsMetaLabel}>sourceId</Text>
                <Text style={styles.detailsMetaValue}>{latest.sourceId}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryModalVisible(false)}
        accessibilityLabel="Full history"
      >
        <Pressable
          style={styles.settingsModalBackdrop}
          onPress={() => setHistoryModalVisible(false)}
          accessibilityLabel="Close"
        >
          <View style={styles.settingsModalContent}>
            <Text style={styles.settingsModalTitle}>Full history coming soon</Text>
            <Pressable
              onPress={() => setHistoryModalVisible(false)}
              style={styles.detailsCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={withingsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWithingsModalVisible(false)}
        accessibilityLabel="Withings"
      >
        <Pressable
          style={styles.settingsModalBackdrop}
          onPress={() => setWithingsModalVisible(false)}
          accessibilityLabel="Close"
        >
          <View style={styles.settingsModalContent} accessibilityLabel="Withings">
            <Text style={styles.settingsModalTitle}>Withings</Text>
            {connected ? (
              <>
                <Text style={styles.withingsModalStatus}>
                  Connected. Manage connection and sync in Devices.
                </Text>
                <Pressable
                  onPress={() => {
                    setWithingsModalVisible(false);
                    router.push("/(app)/settings/devices");
                  }}
                  style={styles.detailsCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Devices"
                >
                  <Text style={styles.detailsCloseText}>Open Devices</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.withingsModalBody}>
                  Connect your Withings scale in Devices. Devices is the home for integrations.
                </Text>
                <Pressable
                  onPress={() => {
                    setWithingsModalVisible(false);
                    router.push("/(app)/settings/devices");
                  }}
                  style={styles.detailsCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Devices"
                >
                  <Text style={styles.detailsCloseText}>Open Devices</Text>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={() => setWithingsModalVisible(false)}
              style={[styles.detailsCloseBtn, { marginTop: 12 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ModuleScreenShell>
  );
}

function HistorySection({
  points,
  unit,
  onViewMore,
}: {
  points: { observedAt: string; weightKg: number; sourceId: string }[];
  unit: "kg" | "lb";
  onViewMore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const last7 = [...points]
    .sort(
      (a, b) =>
        new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
    )
    .slice(0, 7);

  const sourceLabel = (id: string) =>
    id === "withings" ? "Withings" : id === "manual" ? "Manual" : id;

  return (
    <View style={styles.sourcesCard}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.sourcesHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="History"
      >
        <Text style={styles.sourcesTitle}>History</Text>
        <Text style={styles.chevron}>{expanded ? "▼" : "▶"}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.sourcesBody}>
          {last7.map((p, i) => (
            <View key={i} style={styles.sourceRow}>
              <Text style={styles.sourceDate}>
                {new Date(p.observedAt).toLocaleString()}
              </Text>
              <Text style={styles.sourceValue}>
                {formatWeight(p.weightKg, unit)} {unit}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{sourceLabel(p.sourceId)}</Text>
              </View>
            </View>
          ))}
          <Pressable
            onPress={onViewMore}
            style={styles.viewMoreLink}
            accessibilityRole="button"
            accessibilityLabel="View more"
          >
            <Text style={styles.viewMoreLinkText}>View more</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6E6E73",
    textTransform: "uppercase",
  },
  withingsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#F2F2F7",
  },
  withingsChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3C3C43",
  },
  withingsChipStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
  },
  withingsModalStatus: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3C3C43",
    marginTop: 8,
  },
  withingsModalBody: {
    fontSize: 15,
    color: "#3C3C43",
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    padding: 20,
    gap: 12,
  },
  heroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  heroLeft: { flex: 1, minWidth: 0, justifyContent: "center" },
  heroRight: { minWidth: 0, alignItems: "flex-end", gap: 2 },
  bigNumber: { fontSize: 36, fontWeight: "800", color: "#1C1C1E" },
  unitLabel: { fontSize: 18, fontWeight: "600", color: "#6E6E73" },
  lastLoggedLabel: { fontSize: 12, fontWeight: "600", color: "#6E6E73" },
  lastLoggedValue: { fontSize: 13, color: "#3C3C43" },
  updatePill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#F2F2F7",
  },
  updatePillDisabled: { opacity: 0.6 },
  updatePillText: { fontSize: 13, fontWeight: "600", color: "#007AFF" },
  updateStatusText: { fontSize: 12, color: "#6E6E73", marginTop: 4 },
  updateStatusError: { fontSize: 12, color: "#FF3B30", marginTop: 4 },
  sourceLink: { alignSelf: "flex-end", paddingVertical: 4, paddingRight: 0 },
  sourceLinkText: { fontSize: 13, fontWeight: "600", color: "#007AFF" },
  headerMenuBtn: { padding: 12 },
  headerMenuText: { fontSize: 18, color: "#1C1C1E", fontWeight: "700" },
  statTilesScrollView: { marginHorizontal: -16 },
  statTilesScroll: { paddingHorizontal: 16, gap: 12, paddingVertical: 4 },
  statTile: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 100,
  },
  statTileLabel: { fontSize: 12, color: "#6E6E73", marginBottom: 4 },
  statTileValue: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  chartCard: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    padding: 16,
    gap: 12,
  },
  chartContainer: {
    height: CHART_CONTAINER_HEIGHT,
    width: "100%",
  },
  chartSkeleton: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 12,
  },
  skeletonBar: {
    flex: 1,
    height: 40,
    backgroundColor: "#E5E5EA",
    borderRadius: 6,
  },
  actions: { gap: 10 },
  primaryButton: {
    backgroundColor: "#1C1C1E",
    borderRadius: SURFACE_RADIUS,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#1C1C1E", fontSize: 15, fontWeight: "600" },
  sourcesCard: {
    backgroundColor: SURFACE_FILL,
    borderRadius: SURFACE_RADIUS,
    padding: 16,
    gap: 8,
  },
  sourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourcesTitle: { fontSize: 14, fontWeight: "600", color: "#3C3C43" },
  chevron: { fontSize: 12, color: "#6E6E73" },
  sourcesBody: { gap: 8, marginTop: 4 },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  sourceDate: { fontSize: 12, color: "#6E6E73", flex: 1 },
  sourceValue: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  badge: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#3C3C43" },
  viewMoreLink: { marginTop: 8, paddingVertical: 4, alignSelf: "flex-start" },
  viewMoreLinkText: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
  detailsSheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  detailsTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },
  detailsCloseBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  detailsCloseText: { fontSize: 17, fontWeight: "600", color: "#007AFF" },
  detailsBody: { gap: 8 },
  detailsValue: { fontSize: 28, fontWeight: "800", color: "#1C1C1E" },
  detailsDatetime: { fontSize: 15, color: "#3C3C43" },
  detailsSource: { fontSize: 15, fontWeight: "600", color: "#6E6E73" },
  detailsMeta: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E5EA", gap: 6 },
  detailsMetaLabel: { fontSize: 12, fontWeight: "600", color: "#6E6E73" },
  detailsMetaValue: { fontSize: 12, color: "#3C3C43", fontFamily: "monospace" },
  settingsModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  settingsModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
  },
  settingsModalTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E", textAlign: "center" },
});
