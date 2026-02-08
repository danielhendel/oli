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
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { buildStrengthCommandCenterModel } from "@/lib/modules/commandCenterStrength";
import {
  buildCardioCommandCenterModel,
  formatDistanceDualDisplay,
} from "@/lib/modules/commandCenterCardio";
import { buildNutritionCommandCenterModel } from "@/lib/modules/commandCenterNutrition";
import { buildRecoveryCommandCenterModel } from "@/lib/modules/commandCenterRecovery";
import {
  buildBodyCommandCenterModel,
  formatWeightDualDisplay,
} from "@/lib/modules/commandCenterBody";

import { buildLabsCommandCenterModel } from "@/lib/modules/commandCenterLabs";

import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { useIntelligenceContext } from "@/lib/data/useIntelligenceContext";
import { useDayTruth } from "@/lib/data/useDayTruth";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";

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

function formatIsoToLocal(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString();
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
    runsLoading: runsState.status === "partial",
    runsError: runsState.status === "error" ? runsState.error : null,
    selectedRunId: selectedRunIdParam,
    replay: replayState.status === "ready" ? replayState.data : null,
    replayLoading: replayState.status === "partial",
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


function getDisplayLocale(): string {
  try {
    const loc = Intl.DateTimeFormat?.().resolvedOptions?.()?.locale;
    return typeof loc === "string" ? loc : "en-US";
  } catch {
    return "en-US";
  }
}

function CardioSection(props: {
  model: ReturnType<typeof buildCardioCommandCenterModel>;
  onPressWorkouts: () => void;
  onPressFailures: () => void;
}) {
  const m = props.model;
  const locale = getDisplayLocale();

  return (
    <View style={styles.sectionWrap}>
      <ModuleSectionCard title={m.title} rightBadge={m.state} description={m.description}>
        {m.summary ? (
          <View style={styles.cardioGrid}>
            <View style={styles.cardioMetric}>
              <Text style={styles.cardioMetricLabel}>Steps</Text>
              <Text style={styles.cardioMetricValue}>
                {typeof m.summary.steps === "number" ? m.summary.steps.toLocaleString() : "—"}
              </Text>
            </View>
            <View style={styles.cardioMetric}>
              <Text style={styles.cardioMetricLabel}>Move minutes</Text>
              <Text style={styles.cardioMetricValue}>
                {typeof m.summary.moveMinutes === "number" ? m.summary.moveMinutes.toLocaleString() : "—"}
              </Text>
            </View>
            <View style={styles.cardioMetric}>
              <Text style={styles.cardioMetricLabel}>Distance</Text>
              <Text style={styles.cardioMetricValue}>
                {typeof m.summary.distanceKm === "number"
                  ? formatDistanceDualDisplay({ distanceKm: m.summary.distanceKm, locale }).combined
                  : "—"}
              </Text>
            </View>
            <View style={styles.cardioMetric}>
              <Text style={styles.cardioMetricLabel}>Training load</Text>
              <Text style={styles.cardioMetricValue}>
                {typeof m.summary.trainingLoad === "number" ? m.summary.trainingLoad.toFixed(1) : "—"}
              </Text>
            </View>
          </View>
        ) : null}

        {m.showWorkoutsCta ? (
          <ModuleSectionLinkRow
            title="Go to Workouts"
            subtitle="View training and add activity inputs"
            onPress={props.onPressWorkouts}
          />
        ) : null}

        {m.showFailuresCta ? (
          <ModuleSectionLinkRow
            title="View failures"
            subtitle="See why derived truth is missing or invalid"
            onPress={props.onPressFailures}
          />
        ) : null}
      </ModuleSectionCard>
    </View>
  );
}

function NutritionSection(props: {
  model: ReturnType<typeof buildNutritionCommandCenterModel>;
  onPressLog: () => void;
  onPressFailures: () => void;
}) {
  const m = props.model;

  return (
    <View style={styles.sectionWrap}>
      <ModuleSectionCard title={m.title} rightBadge={m.state} description={m.description}>
        {m.summary ? (
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionMetric}>
              <Text style={styles.nutritionMetricLabel}>Kcal</Text>
              <Text style={styles.nutritionMetricValue}>
                {typeof m.summary.totalKcal === "number" ? m.summary.totalKcal.toLocaleString() : "—"}
              </Text>
            </View>
            <View style={styles.nutritionMetric}>
              <Text style={styles.nutritionMetricLabel}>Protein</Text>
              <Text style={styles.nutritionMetricValue}>
                {typeof m.summary.proteinG === "number" ? `${m.summary.proteinG}g` : "—"}
              </Text>
            </View>
            <View style={styles.nutritionMetric}>
              <Text style={styles.nutritionMetricLabel}>Carbs</Text>
              <Text style={styles.nutritionMetricValue}>
                {typeof m.summary.carbsG === "number" ? `${m.summary.carbsG}g` : "—"}
              </Text>
            </View>
            <View style={styles.nutritionMetric}>
              <Text style={styles.nutritionMetricLabel}>Fat</Text>
              <Text style={styles.nutritionMetricValue}>
                {typeof m.summary.fatG === "number" ? `${m.summary.fatG}g` : "—"}
              </Text>
            </View>
          </View>
        ) : null}

        {m.showLogCta ? (
          <ModuleSectionLinkRow
            title="Log nutrition"
            subtitle="Add food entries to build today's summary"
            onPress={props.onPressLog}
          />
        ) : null}

        {m.showFailuresCta ? (
          <ModuleSectionLinkRow
            title="View failures"
            subtitle="See why derived truth is missing or invalid"
            onPress={props.onPressFailures}
          />
        ) : null}
      </ModuleSectionCard>
    </View>
  );
}

function StrengthSection(props: {
  model: ReturnType<typeof buildStrengthCommandCenterModel>;
  onPressLog: () => void;
  onPressFailures: () => void;
}) {
  const m = props.model;

  return (
    <View style={styles.sectionWrap}>
      <ModuleSectionCard title={m.title} rightBadge={m.state} description={m.description}>
        {m.summary ? (
          <View style={styles.strengthGrid}>
            <View style={styles.strengthMetric}>
              <Text style={styles.strengthMetricLabel}>Workouts</Text>
              <Text style={styles.strengthMetricValue}>{m.summary.workoutsCount.toLocaleString()}</Text>
            </View>
            <View style={styles.strengthMetric}>
              <Text style={styles.strengthMetricLabel}>Sets</Text>
              <Text style={styles.strengthMetricValue}>{m.summary.totalSets.toLocaleString()}</Text>
            </View>
            <View style={styles.strengthMetric}>
              <Text style={styles.strengthMetricLabel}>Reps</Text>
              <Text style={styles.strengthMetricValue}>{m.summary.totalReps.toLocaleString()}</Text>
            </View>
            <View style={styles.strengthMetric}>
              <Text style={styles.strengthMetricLabel}>Volume</Text>
              <Text style={styles.strengthMetricValue}>
                {typeof m.summary.totalVolumeByUnit.lb === "number"
                  ? `${Math.round(m.summary.totalVolumeByUnit.lb).toLocaleString()} lb`
                  : "—"}
                {typeof m.summary.totalVolumeByUnit.kg === "number"
                  ? ` / ${Math.round(m.summary.totalVolumeByUnit.kg).toLocaleString()} kg`
                  : ""}
              </Text>
            </View>
          </View>
        ) : null}

        {m.showLogCta ? (
          <ModuleSectionLinkRow
            title="Log a strength workout"
            subtitle="Add sets/reps/weight to build today’s summary"
            onPress={props.onPressLog}
          />
        ) : null}

        {m.showFailuresCta ? (
          <ModuleSectionLinkRow
            title="View failures"
            subtitle="See why derived truth is missing or invalid"
            onPress={props.onPressFailures}
          />
        ) : null}
      </ModuleSectionCard>
    </View>
  );
}

function RecoverySection(props: {
  model: ReturnType<typeof buildRecoveryCommandCenterModel>;
  onPressReadiness: () => void;
  onPressFailures: () => void;
}) {
  const m = props.model;

  const formatDeviation = (val: number): string => {
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}`;
  };

  return (
    <View style={styles.sectionWrap}>
      <ModuleSectionCard title={m.title} rightBadge={m.state} description={m.description}>
        {m.summary ? (
          <View style={styles.recoveryGrid}>
            <View style={styles.recoveryMetric}>
              <Text style={styles.recoveryMetricLabel}>HRV (RMSSD)</Text>
              <Text style={styles.recoveryMetricValue}>
                {typeof m.summary.hrvRmssd === "number" ? m.summary.hrvRmssd.toFixed(1) : "—"}
              </Text>
            </View>
            <View style={styles.recoveryMetric}>
              <Text style={styles.recoveryMetricLabel}>Baseline</Text>
              <Text style={styles.recoveryMetricValue}>
                {typeof m.summary.hrvRmssdBaseline === "number" ? m.summary.hrvRmssdBaseline.toFixed(1) : "—"}
              </Text>
            </View>
            <View style={styles.recoveryMetric}>
              <Text style={styles.recoveryMetricLabel}>Deviation</Text>
              <Text style={styles.recoveryMetricValue}>
                {typeof m.summary.hrvRmssdDeviation === "number"
                  ? formatDeviation(m.summary.hrvRmssdDeviation)
                  : "—"}
              </Text>
            </View>
          </View>
        ) : null}

        {m.showReadinessCta ? (
          <ModuleSectionLinkRow
            title="View readiness"
            subtitle="Check recovery readiness and HRV status"
            onPress={props.onPressReadiness}
          />
        ) : null}

        {m.showFailuresCta ? (
          <ModuleSectionLinkRow
            title="View failures"
            subtitle="See why derived truth is missing or invalid"
            onPress={props.onPressFailures}
          />
        ) : null}
      </ModuleSectionCard>
    </View>
  );
}


function LabsSection(props: {
  model: ReturnType<typeof buildLabsCommandCenterModel>;
  onPressUpload: () => void;
  onPressView: () => void;
  onPressFailures: () => void;
}) {
  const m = props.model;

  return (
    <View style={styles.sectionWrap}>
      <ModuleSectionCard title={m.title} rightBadge={m.state} description={m.description}>
        {m.showUploadCta ? (
          <ModuleSectionLinkRow
            title="Upload labs"
            subtitle="Add lab reports and bloodwork"
            onPress={props.onPressUpload}
          />
        ) : null}

        {m.showViewCta ? (
          <ModuleSectionLinkRow
            title="View labs"
            subtitle="See your lab uploads and overview"
            onPress={props.onPressView}
          />
        ) : null}

        {m.showFailuresCta ? (
          <ModuleSectionLinkRow
            title="View failures"
            subtitle="See why derived truth is missing or invalid"
            onPress={props.onPressFailures}
          />
        ) : null}
      </ModuleSectionCard>
    </View>
  );
}

function BodySection(props: {
  model: ReturnType<typeof buildBodyCommandCenterModel>;
  locale: string;
  onPressLogWeight: () => void;
  onPressFailures: () => void;
}) {
  const m = props.model;
  const locale = props.locale;

  return (
    <View style={styles.sectionWrap}>
      <ModuleSectionCard title={m.title} rightBadge={m.state} description={m.description}>
        {m.summary ? (
          <View style={styles.bodyGrid}>
            <View style={styles.bodyMetric}>
              <Text style={styles.bodyMetricLabel}>Weight</Text>
              <Text style={styles.bodyMetricValue}>
                {typeof m.summary.weightKg === "number"
                  ? formatWeightDualDisplay({ weightKg: m.summary.weightKg, locale }).combined
                  : "—"}
              </Text>
            </View>
            <View style={styles.bodyMetric}>
              <Text style={styles.bodyMetricLabel}>Body fat</Text>
              <Text style={styles.bodyMetricValue}>
                {typeof m.summary.bodyFatPercent === "number"
                  ? `${m.summary.bodyFatPercent.toFixed(1)}%`
                  : "—"}
              </Text>
            </View>
          </View>
        ) : null}

        {m.showLogWeightCta ? (
          <ModuleSectionLinkRow
            title="Log weight"
            subtitle="Add weight entry to build today's body summary"
            onPress={props.onPressLogWeight}
          />
        ) : null}

        {m.showFailuresCta ? (
          <ModuleSectionLinkRow
            title="View failures"
            subtitle="See why derived truth is missing or invalid"
            onPress={props.onPressFailures}
          />
        ) : null}
      </ModuleSectionCard>
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

function QuickActionsRow(props: { dayKey: string }) {
  const router = useRouter();
  const { dayKey } = props;

  return (
    <View style={styles.quickActionsRow}>
      <Pressable
        onPress={() => router.push({ pathname: "/(app)/body/weight", params: { day: dayKey } })}
        style={styles.quickActionBtn}
      >
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

type FailuresPresenceUi =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; hasFailures: boolean; latestCreatedAt: string | null };

function FailurePresenceCard(props: { state: FailuresPresenceUi; onPress: () => void }) {
  const s = props.state;

  if (s.status === "partial") {
    return (
      <Pressable onPress={props.onPress} style={[styles.failuresCard, styles.failuresCardNeutral]}>
        <Text style={styles.failuresLabel}>Failures</Text>
        <Text style={styles.failuresTitle}>Checking…</Text>
        <Text style={styles.failuresSubtitle}>If failures exist, they will be shown.</Text>
      </Pressable>
    );
  }

  if (s.status === "error") {
    return (
      <Pressable onPress={props.onPress} style={[styles.failuresCard, styles.failuresCardDanger]}>
        <Text style={[styles.failuresLabel, styles.failuresDangerText]}>Failures</Text>
        <Text style={[styles.failuresTitle, styles.failuresDangerText]}>Failed to load failures</Text>
        <Text style={styles.failuresSubtitle}>
          {s.error}
          {s.requestId ? ` • Request ID: ${s.requestId}` : ""}
        </Text>
      </Pressable>
    );
  }

  // ready
  if (!s.hasFailures) {
    return (
      <Pressable onPress={props.onPress} style={[styles.failuresCard, styles.failuresCardNeutral]}>
        <Text style={styles.failuresLabel}>Failures</Text>
        <Text style={styles.failuresTitle}>No failures recorded</Text>
        <Text style={styles.failuresSubtitle}>No failed, rejected, or missing data has been written.</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={props.onPress} style={[styles.failuresCard, styles.failuresCardWarning]}>
      <Text style={[styles.failuresLabel, styles.failuresWarningText]}>Failures</Text>
      <Text style={[styles.failuresTitle, styles.failuresWarningText]}>Failures recorded</Text>
      <Text style={styles.failuresSubtitle}>
        Latest: {s.latestCreatedAt ?? "—"} • Tap to view all failures.
      </Text>
    </Pressable>
  );
}

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export default function CommandCenterScreen(props: Props) {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string; refresh?: string; ow?: string }>();

  const paramDay = typeof params.day === "string" && YYYY_MM_DD.test(params.day) ? params.day : null;
  const paramRefresh = typeof params.refresh === "string" ? params.refresh : null;
  const paramOptimisticWeightKg =
    typeof params.ow === "string" ? (() => { const n = parseFloat(params.ow); return Number.isFinite(n) ? n : null; })() : null;

  const todayKey = useMemo(() => getTodayDayKey(), []);
  const dayKey = paramDay ?? todayKey;

  const [refreshKey, setRefreshKey] = useState<string | null>(paramRefresh);
  const [optimisticWeightKg, setOptimisticWeightKg] = useState<number | null>(paramOptimisticWeightKg);

  useEffect(() => {
    setRefreshKey(paramRefresh);
  }, [paramRefresh]);

  useEffect(() => {
    setOptimisticWeightKg(paramOptimisticWeightKg);
  }, [paramOptimisticWeightKg]);

  const dayTruth = useDayTruth(dayKey);
  const facts = useDailyFacts(dayKey);
  const insights = useInsights(dayKey);
  const ctx = useIntelligenceContext(dayKey);

  // Sprint 1: Failure presence must be visible and must not depend on readiness logic.
  // We query a tiny range with limit=1 and surface its truth immediately.
  const failuresPresence = useFailuresRange(
    { start: "1970-01-01", end: dayKey, limit: 1 },
    { mode: "page" },
  );

  const uploadsPresence = useUploadsPresence();

  const failuresPresenceUi: FailuresPresenceUi = useMemo(() => {
    if (failuresPresence.status === "partial") return { status: "partial" };
    if (failuresPresence.status === "error") {
      return { status: "error", error: failuresPresence.error, requestId: failuresPresence.requestId };
    }

    const first = failuresPresence.data.items[0] ?? null;
    const latest = first?.createdAt ? formatIsoToLocal(first.createdAt) : null;

    return {
      status: "ready",
      hasFailures: failuresPresence.data.items.length > 0,
      latestCreatedAt: latest,
    };
  }, [failuresPresence]);

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

  const latestEventAt = replayModeActive ? replay?.latestCanonicalEventAt ?? null : latestEventAtLive;

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

  // Sprint 0 Option A: day has data if events exist OR derived truth (facts/context) exists.
  const hasDataForDay = replayModeActive
    ? Boolean(factsDoc) || Boolean(ctxDoc) || Boolean(replay?.latestCanonicalEventAt)
    : dayTruth.status === "ready" &&
      (dayTruth.data.eventsCount > 0 || factsComputedAt != null || ctxComputedAt != null);

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
        network: facts.status === "partial" ? "loading" : facts.status === "error" ? "error" : "ok",
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
        network: ctx.status === "partial" ? "loading" : ctx.status === "error" ? "error" : "ok",
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
      ? Boolean(props.replayLoading ?? replayLoading) || dayTruth.status === "partial"
      : dayTruth.status === "partial" || facts.status === "partial" || insights.status === "partial" || ctx.status === "partial";

  const anyError =
    replayModeActive
      ? Boolean(props.replayError ?? replayError) || dayTruth.status === "error"
      : dayTruth.status === "error" || facts.status === "error" || insights.status === "error" || ctx.status === "error";

  const dataReadinessState =
    replayModeActive
      ? anyLoading
        ? "partial"
        : anyError
          ? "error"
          : hasDataForDay
            ? derivedReady
              ? "ready"
              : "partial"
            : "missing"
      : factsReadiness && ctxReadiness
        ? factsReadiness.state === "error" || ctxReadiness.state === "error"
          ? "error"
          : factsReadiness.state === "partial" || ctxReadiness.state === "partial"
            ? "partial"
            : factsReadiness.state === "missing" || ctxReadiness.state === "missing"
              ? "missing"
              : "ready"
        : "partial";

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

      // Failure presence must also refresh when Command Center refreshes.
      void failuresPresence.refetch(opts);
      void uploadsPresence.refetch(opts);
    },
    [dayTruth.refetch, facts.refetch, insights.refetch, ctx.refetch, failuresPresence.refetch, uploadsPresence.refetch],
  );

  useEffect(() => {
    kickRefetch();
  }, [props.focusNonce, kickRefetch]);

  useEffect(() => {
    const rk = refreshKey;
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
  }, [refreshKey, latestEventAt, factsComputedAt, ctxComputedAt, stopPolling, kickRefetch]);

  useEffect(() => {
    if (!refreshKey) return;

    const canonicalAdvanced = baselineCanonicalAt.current && latestEventAt ? latestEventAt !== baselineCanonicalAt.current : false;
    const factsAdvanced = baselineFactsAt.current && factsComputedAt ? factsComputedAt !== baselineFactsAt.current : false;
    const ctxAdvanced = baselineCtxAt.current && ctxComputedAt ? ctxComputedAt !== baselineCtxAt.current : false;

    const pipelineCaughtUp = canonicalAdvanced && derivedReady && factsAdvanced && ctxAdvanced;
    if (pipelineCaughtUp) stopPolling();
  }, [refreshKey, latestEventAt, factsComputedAt, ctxComputedAt, derivedReady, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeRefresh((ev) => {
        if (ev.topic !== "commandCenter") return;
        consumeRefresh(ev.topic, ev.key);
        setRefreshKey(ev.key);
        if ("optimisticWeightKg" in ev && typeof ev.optimisticWeightKg === "number") {
          setOptimisticWeightKg(ev.optimisticWeightKg);
        }
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
  } else if (!hasDataForDay) {
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

  const optimistic = typeof optimisticWeightKg === "number" ? optimisticWeightKg : null;

  const factsMatchOptimistic =
    typeof currentWeightKg === "number" && optimistic !== null && Math.abs(currentWeightKg - optimistic) < eps;

  const inRefreshWindow = refreshKey !== null && optimistic !== null && !factsMatchOptimistic;

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

  const displayLocale = useMemo(() => getDisplayLocale(), []);

  const cardioModel = useMemo(() => {
    const hasFailures = failuresPresenceUi.status === "ready" ? failuresPresenceUi.hasFailures : false;
    return buildCardioCommandCenterModel({
      dataReadinessState,
      factsDoc: factsDoc ?? null,
      hasFailures,
      locale: displayLocale,
    });
  }, [dataReadinessState, factsDoc, failuresPresenceUi, displayLocale]);

  const strengthModel = useMemo(() => {
    const hasFailures = failuresPresenceUi.status === "ready" ? failuresPresenceUi.hasFailures : false;
    return buildStrengthCommandCenterModel({
      dataReadinessState: dataReadinessState,
      factsDoc: factsDoc ?? null,
      hasFailures,
    });
  }, [dataReadinessState, factsDoc, failuresPresenceUi]);

  const nutritionModel = useMemo(() => {
    const hasFailures = failuresPresenceUi.status === "ready" ? failuresPresenceUi.hasFailures : false;
    return buildNutritionCommandCenterModel({
      dataReadinessState,
      factsDoc: factsDoc ?? null,
      hasFailures,
    });
  }, [dataReadinessState, factsDoc, failuresPresenceUi]);

  const recoveryModel = useMemo(() => {
    const hasFailures = failuresPresenceUi.status === "ready" ? failuresPresenceUi.hasFailures : false;
    return buildRecoveryCommandCenterModel({
      dataReadinessState,
      factsDoc: factsDoc ?? null,
      hasFailures,
    });
  }, [dataReadinessState, factsDoc, failuresPresenceUi]);


  const bodyModel = useMemo(() => {
    const hasFailures = failuresPresenceUi.status === "ready" ? failuresPresenceUi.hasFailures : false;
    return buildBodyCommandCenterModel({
      dataReadinessState,
      factsDoc: factsDoc ?? null,
      hasFailures,
      locale: displayLocale,
    });
  }, [dataReadinessState, factsDoc, failuresPresenceUi, displayLocale]);

  const labsModel = useMemo(() => {
    const hasFailures = failuresPresenceUi.status === "ready" ? failuresPresenceUi.hasFailures : false;
    const uploads =
      uploadsPresence.status === "ready" ? { count: uploadsPresence.data.count, latest: uploadsPresence.data.latest } : null;
    return buildLabsCommandCenterModel({
      dataReadinessState,
      uploads,
      hasFailures,
    });
  }, [dataReadinessState, uploadsPresence, failuresPresenceUi]);

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

        {/* Sprint 1: Failure presence is surfaced before readiness/status UI. */}
        <FailurePresenceCard state={failuresPresenceUi} onPress={() => router.push("/(app)/failures")} />

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

        <QuickActionsRow dayKey={dayKey} />


        <BodySection
          model={bodyModel}
          locale={displayLocale}
          onPressLogWeight={() =>
            router.push({ pathname: "/(app)/body/weight", params: { day: dayKey } })
          }
          onPressFailures={() => router.push("/(app)/failures")}
        />

        <RecoverySection
          model={recoveryModel}
          onPressReadiness={() => router.push("/(app)/recovery/readiness")}
          onPressFailures={() => router.push("/(app)/failures")}
        />

        <NutritionSection
          model={nutritionModel}
          onPressLog={() => router.push("/(app)/nutrition/log")}
          onPressFailures={() => router.push("/(app)/failures")}
        />

        <CardioSection
          model={cardioModel}
          onPressWorkouts={() => router.push("/(app)/workouts")}
          onPressFailures={() => router.push("/(app)/failures")}
        />

        <StrengthSection
          model={strengthModel}
          onPressLog={() =>
            router.push({ pathname: "/(app)/training/strength/log", params: { day: dayKey } })
          }
          onPressFailures={() => router.push("/(app)/failures")}
        />

        <LabsSection
          model={labsModel}
          onPressUpload={() => router.push("/(app)/labs/upload")}
          onPressView={() => router.push("/(app)/labs/overview")}
          onPressFailures={() => router.push("/(app)/failures")}
        />

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

  failuresCard: {
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 6,
  },
  failuresCardNeutral: { backgroundColor: "#F2F2F7" },
  failuresCardWarning: { backgroundColor: "#FFF5E6" },
  failuresCardDanger: { backgroundColor: "#FDECEC" },
  failuresLabel: { fontSize: 12, fontWeight: "900", color: "#111", letterSpacing: 0.2 },
  failuresTitle: { fontSize: 16, fontWeight: "900", marginTop: 6, color: "#111" },
  failuresSubtitle: { fontSize: 13, marginTop: 6, color: "#333", opacity: 0.85 },
  failuresWarningText: { color: "#7A4E00" },
  failuresDangerText: { color: "#B00020" },

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

  sectionWrap: {
    marginTop: 12,
  },

  strengthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  cardioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cardioMetric: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  cardioMetricLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "700",
  },
  cardioMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    color: "#111",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  nutritionMetric: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  nutritionMetricLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "700",
  },
  nutritionMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    color: "#111",
  },
  strengthMetric: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  strengthMetricLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "700",
  },
  strengthMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    color: "#111",
  },

  recoveryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recoveryMetric: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  recoveryMetricLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "700",
  },
  recoveryMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    color: "#111",
  },

  bodyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bodyMetric: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  bodyMetricLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "700",
  },
  bodyMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    color: "#111",
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
