import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyWeeklyStrip } from "@/lib/ui/body/BodyWeeklyStrip";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  BODY_APPLE_HEALTH_SETTINGS_HREF,
  BodyAppleHealthConnectSheet,
} from "@/lib/ui/body/BodyAppleHealthConnectSheet";
import { BodyCompositionSummaryScreen } from "@/lib/ui/body/BodyCompositionSummaryScreen";
import { BodyScansLandingSection } from "@/lib/ui/body-scans/BodyScansLandingSection";
import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useBodyScans } from "@/lib/data/body-scans/useBodyScans";
import { BodyMetricManualEntrySheet } from "@/lib/ui/body/BodyMetricManualEntrySheet";
import type { BodyMetricManualEntryMetric } from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useAppleHealthBodyAccessState } from "@/lib/data/body/useAppleHealthBodyAccessState";
import { useAppleHealthBodyBackfill } from "@/lib/data/body/useAppleHealthBodyBackfill";
import { useAppleHealthBodyConnectSheet } from "@/lib/data/body/useAppleHealthBodyConnectSheet";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import {
  applyBodyFatPrimaryView,
  applyLeanMassPrimaryView,
  applyWeightPrimaryView,
} from "@/lib/body/presentation/applyBodyMetricPrimaryView";
import {
  BODY_COMPOSITION_SUMMARY_COPY,
  buildBodyMetricSummaryCards,
} from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import {
  DEFAULT_BODY_PRIMARY_VIEW_STATE,
  type BodyFatPrimaryView,
  type LeanMassPrimaryView,
  type WeightPrimaryView,
} from "@/lib/body/presentation/bodyMetricPrimaryViews";
import { ageYearsFromProfileDateOfBirth } from "@/lib/body/bodyCompositionShared";
import {
  resolveUserProfileMainForInterpretation,
} from "@/lib/data/body/useBodyCompositionInterpretation";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { UI_SCREEN_BG, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/** @internal — tests assert on these hrefs */
export const BODY_METRIC_DETAIL_HREFS = BODY_COMPOSITION_METRIC_DETAIL_ROUTES;

/**
 * Feature flag for the legacy horizontal weekday/date calendar strip in the Body Composition
 * header. Hidden to match the Activity page pattern; flip to `true` to re-enable the strip
 * (the {@link BodyWeeklyStrip} component and its routing remain intact).
 */
export const BODY_SHOW_WEEKLY_CALENDAR_STRIP = false;

export default function BodyOverviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";
  const { state: profileState } = useUserProfileMain();
  const profileMain = useMemo(
    () => resolveUserProfileMainForInterpretation(profileState),
    [profileState],
  );
  const body = useBodyOverviewData();
  const [manualEntryMetric, setManualEntryMetric] =
    useState<BodyMetricManualEntryMetric | null>(null);
  const [weightPrimaryView, setWeightPrimaryView] = useState<WeightPrimaryView>(
    DEFAULT_BODY_PRIMARY_VIEW_STATE.weight,
  );
  const [bodyFatPrimaryView, setBodyFatPrimaryView] = useState<BodyFatPrimaryView>(
    DEFAULT_BODY_PRIMARY_VIEW_STATE.bodyFat,
  );
  const [leanMassPrimaryView, setLeanMassPrimaryView] = useState<LeanMassPrimaryView>(
    DEFAULT_BODY_PRIMARY_VIEW_STATE.leanMass,
  );
  const bodyBackfill = useAppleHealthBodyBackfill(() => {
    void body.series.refetch({ cacheBust: `bodyBackfill:${Date.now()}` });
    void body.peek.refetch({ cacheBust: `bodyBackfillPeek:${Date.now()}` });
    void body.snapshotDayPeek.refetch({ cacheBust: `bodyBackfillSnapshotPeek:${Date.now()}` });
    void body.dayFacts.refetch({ cacheBust: `bodyBackfill:${Date.now()}` });
  });
  const access = useAppleHealthBodyAccessState({
    syncAppleHealthBodyNow: body.syncAppleHealthBodyNow,
    series: body.series,
    observeTrends: false,
    overviewProbe: body.peek,
    overviewPeekHasSamples: body.peek.status === "ready" && body.peek.items.length > 0,
    isBodySyncing: body.isBodySyncing,
    isBackfillRunning: bodyBackfill.state.status === "running",
    hasHealthKitBodyPipelineEvidence:
      body.hasSuccessfulBodySync || bodyBackfill.state.status === "completed",
  });

  const refetchBodyAfterImport = useCallback(() => {
    void body.series.refetch({ cacheBust: `bodyConnect:${Date.now()}` });
    void body.peek.refetch({ cacheBust: `bodyConnectPeek:${Date.now()}` });
    void body.snapshotDayPeek.refetch({ cacheBust: `bodyConnectSnapshot:${Date.now()}` });
    void body.dayFacts.refetch({ cacheBust: `bodyConnect:${Date.now()}` });
  }, [body.series, body.peek, body.snapshotDayPeek, body.dayFacts]);

  const connectSheet = useAppleHealthBodyConnectSheet({
    accessPhase: access.phase,
    onDataMaybeChanged: refetchBodyAfterImport,
    refreshAccess: access.refreshAuth,
  });

  /** Account-scoped connection chip — prefer connect-sheet transient states. */
  const connectionActionForMetric = useCallback(
    (metric: "weight" | "bodyFat" | "leanTissue") => {
      const status = connectSheet.cardActionsByMetric[metric];
      return { kind: status.kind, label: status.label };
    },
    [connectSheet.cardActionsByMetric],
  );

  useEffect(() => {
    // Landing owns Total Mass / Components hierarchy only.
    // Calendar and list/history live on metric-specific detail headers.
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: BODY_COMPOSITION_SUMMARY_COPY.pageTitle,
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to previous screen"
        />
      ),
      headerRight: () => null,
    });
  }, [navigation]);

  const headerContent = BODY_SHOW_WEEKLY_CALENDAR_STRIP ? (
    <BodyWeeklyStrip
      days={body.weekDays}
      selectedDay={body.today}
      onDayPress={(day) => router.push({ pathname: "/(app)/body/day/[day]", params: { day } })}
    />
  ) : undefined;

  const seriesError = body.series.status === "error";
  const profileSlice = useMemo(() => {
    const sexRaw = profileMain.identity.sexAtBirth;
    const sex =
      sexRaw === "female" || sexRaw === "male"
        ? sexRaw
        : sexRaw == null
          ? null
          : ("unspecified" as const);
    return {
      heightCm: profileMain.body.heightCm ?? null,
      ageYears: ageYearsFromProfileDateOfBirth(profileMain.identity.dateOfBirth ?? null),
      sex,
    };
  }, [profileMain]);
  const baseCards = useMemo(
    () =>
      buildBodyMetricSummaryCards({
        overview: {
          overviewDay: body.overview.overviewDay,
          weightKg: body.overview.weightKg,
          bodyFatPercent: body.overview.bodyFatPercent,
          leanBodyMassKg: body.overview.leanBodyMassKg,
          bmi: body.overview.bmi,
          hasAnyMetric: body.overview.hasAnyMetric,
          latestObservedAtIso: body.overview.latestObservedAtIso ?? null,
        },
        profile: profileSlice,
        unit,
        seriesError,
      }),
    [body.overview, profileSlice, unit, seriesError],
  );

  const pairingEvidence = useMemo(
    () => ({
      weightKg: body.overview.weightKg,
      bodyFatPercent: body.overview.bodyFatPercent,
      leanBodyMassKg: body.overview.leanBodyMassKg,
      overviewDay: body.overview.overviewDay,
      latestObservedAtIso: body.overview.latestObservedAtIso ?? null,
    }),
    [
      body.overview.weightKg,
      body.overview.bodyFatPercent,
      body.overview.leanBodyMassKg,
      body.overview.overviewDay,
      body.overview.latestObservedAtIso,
    ],
  );

  const cards = useMemo(() => {
    const [weightCard, bodyFatCard, leanCard] = baseCards;
    const weightResolveInput = {
      metric: "weight" as const,
      weightKg: body.overview.weightKg,
      bodyFatPercent: body.overview.bodyFatPercent,
      leanBodyMassKg: body.overview.leanBodyMassKg,
      bmi: body.overview.bmi,
      heightCm: profileSlice.heightCm,
      ageYears: profileSlice.ageYears,
      sex: profileSlice.sex,
      measurementMethod: "height_and_weight",
      massDisplayUnit: unit,
    };
    return [
      applyWeightPrimaryView({
        card: weightCard,
        view: weightPrimaryView,
        resolveInput: weightResolveInput,
      }),
      applyBodyFatPrimaryView({
        card: bodyFatCard,
        view: bodyFatPrimaryView,
        massDisplayUnit: unit,
        evidence: pairingEvidence,
        ageYears: profileSlice.ageYears,
        sex: profileSlice.sex,
      }),
      applyLeanMassPrimaryView({
        card: leanCard,
        view: leanMassPrimaryView,
        massDisplayUnit: unit,
        evidence: pairingEvidence,
      }),
    ] as const;
  }, [
    baseCards,
    body.overview,
    profileSlice,
    unit,
    weightPrimaryView,
    bodyFatPrimaryView,
    leanMassPrimaryView,
    pairingEvidence,
  ]);

  const bodyScansEnabled = isBodyScansV1Enabled();
  const bodyScans = useBodyScans({ enabled: bodyScansEnabled, limit: 3 });
  const bodyScansSlot = bodyScansEnabled ? (
    <BodyScansLandingSection
      status={bodyScans.status}
      {...(bodyScans.status === "ready" ? { items: bodyScans.data.items } : {})}
      onPressScan={(scanId) => router.push(`/(app)/body/scans/${scanId}`)}
      onPressSeeAll={() => router.push("/(app)/body/scans")}
      onPressUpload={() => router.push("/(app)/body/scans/new")}
    />
  ) : null;

  const measurementErrorSlot = seriesError ? (
    <View style={styles.measurementError} testID="body-composition-measurement-error">
      <Text style={styles.measurementErrorTitle}>Couldn’t load Body measurements</Text>
      <Text style={styles.measurementErrorBody}>
        Your metric cards stay visible. Try again when your connection is ready.
      </Text>
      <Pressable
        style={styles.retryBtn}
        onPress={() => body.series.refetch()}
        accessibilityRole="button"
        accessibilityLabel="Retry loading Body measurements"
        testID="body-composition-measurement-retry"
      >
        <Text style={styles.retryBtnText}>Retry</Text>
      </Pressable>
    </View>
  ) : body.pullRefreshError ? (
    <View style={styles.syncBanner} testID="body-composition-pull-refresh-error">
      <Text style={styles.syncBannerText}>{body.pullRefreshError}</Text>
    </View>
  ) : access.phase === "syncing" ? (
    <View style={styles.syncBanner} testID="body-composition-sync-banner">
      <Text style={styles.syncBannerText}>Syncing Apple Health…</Text>
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title={BODY_COMPOSITION_SUMMARY_COPY.pageTitle}
        hideTitleChrome
        compactHeader={BODY_SHOW_WEEKLY_CALENDAR_STRIP}
        {...(headerContent != null ? { headerContent } : {})}
        refreshControl={
          <RefreshControl
            refreshing={body.isPullRefreshing}
            onRefresh={() => {
              void body.onPullToRefresh();
            }}
            tintColor={BODY_INDIGO}
            accessibilityLabel="Refresh Body measurements"
          />
        }
      >
        <View style={styles.pageBody}>
          <BodyCompositionSummaryScreen
            cards={cards}
            connectionActionForMetric={connectionActionForMetric}
            onPressCard={(href) => router.push(href as never)}
            onPressAddMeasurementForMetric={(metric) => {
              if (metric === "weight") setManualEntryMetric("weight");
              else if (metric === "bodyFat") setManualEntryMetric("bodyFat");
              else if (metric === "leanTissue") setManualEntryMetric("leanMass");
            }}
            onPressConnectionActionForMetric={(metric) => {
              connectSheet.onPressCardConnection(metric);
            }}
            massDisplayUnit={unit}
            weightPrimaryView={weightPrimaryView}
            onChangeWeightPrimaryView={setWeightPrimaryView}
            bodyFatPrimaryView={bodyFatPrimaryView}
            onChangeBodyFatPrimaryView={setBodyFatPrimaryView}
            leanMassPrimaryView={leanMassPrimaryView}
            onChangeLeanMassPrimaryView={setLeanMassPrimaryView}
            measurementErrorSlot={measurementErrorSlot}
            bodyScansSlot={bodyScansSlot}
          />
        </View>
      </ModuleScreenShell>
      <BodyAppleHealthConnectSheet
        visible={connectSheet.visible}
        phase={connectSheet.phase}
        activeMetric={connectSheet.activeMetric}
        historyAttention={connectSheet.historyAttention}
        lastSuccessfulSyncAtIso={connectSheet.lastSuccessfulSyncAtIso}
        historyLabel={connectSheet.historyLabel}
        statusChipLabel={connectSheet.statusChipLabel}
        bodyScopeConnected={connectSheet.bodyScopeConnected}
        metricSync={connectSheet.metricSync}
        onToggleMetricSync={(metricId, enabled) => {
          void connectSheet.onToggleMetricSync(metricId, enabled);
        }}
        onClose={connectSheet.close}
        onPrimary={connectSheet.onPrimary}
        onOpenAppleHealthSettings={() => {
          connectSheet.close();
          router.push(BODY_APPLE_HEALTH_SETTINGS_HREF as never);
        }}
      />
      <BodyMetricManualEntrySheet
        visible={manualEntryMetric != null}
        metric={manualEntryMetric}
        onClose={() => setManualEntryMetric(null)}
        onSaved={() => {
          const bust = `manualBody:${Date.now()}`;
          setManualEntryMetric(null);
          void body.series.refetch({ cacheBust: bust });
          void body.peek.refetch({ cacheBust: `${bust}:peek` });
          void body.snapshotDayPeek.refetch({ cacheBust: `${bust}:snapshot` });
          void body.dayFacts.refetch({ cacheBust: bust });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageBody: {
    backgroundColor: UI_SCREEN_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  measurementError: {
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  measurementErrorTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  measurementErrorBody: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  retryBtnText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
  syncBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(58,91,219,0.1)",
  },
  syncBannerText: { fontSize: 14, fontWeight: "600", color: BODY_INDIGO },
});
