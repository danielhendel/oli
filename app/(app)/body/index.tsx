import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyWeeklyStrip } from "@/lib/ui/body/BodyWeeklyStrip";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";
import { BodyAppleHealthPermissionCard } from "@/lib/ui/body/BodyAppleHealthPermissionCard";
import { BodyCompositionEducationScreen } from "@/lib/ui/body/BodyCompositionEducationScreen";
import { BodyTodayCard } from "@/lib/ui/body/BodyTodayCard";
import { BodyWeeklyWeightCard } from "@/lib/ui/body/BodyWeeklyWeightCard";
import { BodyWeightBaselineDeltaCard } from "@/lib/ui/body/BodyWeightBaselineDeltaCard";
import { BodyYearlyWeightCard } from "@/lib/ui/body/BodyYearlyWeightCard";
import { WeightLogModal } from "@/lib/ui/WeightLogModal";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useAppleHealthBodyAccessState } from "@/lib/data/body/useAppleHealthBodyAccessState";
import { useAppleHealthBodyBackfill } from "@/lib/data/body/useAppleHealthBodyBackfill";
import { useBodyWeightTrendCards } from "@/lib/data/body/useBodyWeightTrendCards";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { BODY_COMPOSITION_EDUCATION_MODEL } from "@/lib/body/education/bodyCompositionEducationModel";
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
  const body = useBodyOverviewData();
  const [weightLogVisible, setWeightLogVisible] = useState(false);
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

  const showAppleHealthConnectCard =
    access.phase === "not_determined" ||
    access.phase === "denied" ||
    access.phase === "unavailable" ||
    access.phase === "loading";
  const permissionCardVariant =
    access.phase === "unavailable"
      ? "unavailable"
      : access.phase === "denied"
        ? "denied"
        : access.phase === "loading"
          ? "checking"
          : "connect";

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: BODY_COMPOSITION_EDUCATION_MODEL.pageTitle,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          gap={10}
          calendarAccessibilityLabel="Open body calendar"
          onCalendarPress={() => router.push("/(app)/body/calendar")}
          logAccessibilityLabel="Open body composition log"
          onLogPress={() => router.push("/(app)/body/list")}
        />
      ),
    });
  }, [navigation, router]);

  const headerContent = BODY_SHOW_WEEKLY_CALENDAR_STRIP ? (
    <BodyWeeklyStrip
      days={body.weekDays}
      selectedDay={body.today}
      onDayPress={(day) => router.push({ pathname: "/(app)/body/day/[day]", params: { day } })}
    />
  ) : undefined;

  const seriesLoading = body.series.status === "partial";
  const overviewLoading = seriesLoading || body.peek.status === "partial";
  const overviewError =
    body.series.status === "error"
      ? {
          message: body.series.error,
          requestId: body.series.requestId,
          onRetry: () => body.series.refetch(),
        }
      : body.peek.status === "error"
        ? { message: body.peek.error, requestId: body.peek.requestId, onRetry: () => body.peek.refetch() }
        : null;

  const trend = useBodyWeightTrendCards({
    today: body.today,
    unit,
    samples: body.weightSamples ?? [],
    overview: body.overview,
  });

  const hasAnyExistingBodyMeasurement =
    body.overview.hasAnyMetric === true ||
    (Array.isArray(body.weightSamples) && body.weightSamples.length > 0);

  const todayEmptyTitle =
    access.phase === "granted_no_data" ? "No body measurements yet" : "No body data yet";
  const todayEmptyDescription =
    access.phase === "granted_no_data"
      ? "Add a measurement in Apple Health or sync a connected source. Open Body again after your data updates."
      : "When Apple Health has body data, your latest snapshot will appear here.";

  const unavailableMsg =
    access.authSnapshot?.kind === "unavailable" ? access.authSnapshot.error : undefined;

  const appleHealthSlot = showAppleHealthConnectCard ? (
    <View style={styles.appleHealthSlot}>
      <BodyAppleHealthPermissionCard
        variant={permissionCardVariant}
        {...(typeof unavailableMsg === "string" ? { unavailableMessage: unavailableMsg } : {})}
        onAllowAccess={() => {
          void access.onAllowAppleHealthBodyAccess();
        }}
        onOpenSettings={access.onOpenAppSettings}
      />
      {Platform.OS === "ios" ? (
        <Pressable
          onPress={() => router.push("/(app)/settings/devices/apple_health")}
          style={styles.secondaryLinkWrap}
          accessibilityRole="button"
          accessibilityLabel="Open Apple Health device settings"
        >
          <Text style={styles.secondaryLink}>Apple Health in Settings</Text>
        </Pressable>
      ) : null}
    </View>
  ) : (
    <View style={styles.appleHealthConnectedNote} testID="body-apple-health-connected-note">
      <Text style={styles.appleHealthConnectedText}>
        Apple Health access is available for Body transport. Review connected devices anytime in Settings.
      </Text>
      {Platform.OS === "ios" ? (
        <Pressable
          onPress={() => router.push("/(app)/settings/devices/apple_health")}
          style={styles.secondaryLinkWrap}
          accessibilityRole="button"
          accessibilityLabel="Open Apple Health device settings"
        >
          <Text style={styles.secondaryLink}>Review Apple Health access</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const measurementsSlot = (
    <View style={styles.measurementsStack} testID="body-composition-existing-measurements">
      {access.phase === "syncing" ? (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>Syncing Apple Health…</Text>
        </View>
      ) : null}

      {body.series.status === "error" ? (
        <View style={styles.measurementError} testID="body-composition-measurement-error">
          <Text style={styles.measurementErrorTitle}>Couldn’t load Body measurements</Text>
          <Text style={styles.measurementErrorBody}>
            Educational guidance stays available. Try again when your connection is ready.
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
      ) : (
        <>
          <BodyTodayCard
            loading={overviewLoading}
            error={overviewError}
            model={trend.todayCardModel}
            emptyTitle={todayEmptyTitle}
            emptyDescription={todayEmptyDescription}
            onPressRow={(href) => router.push(href as never)}
          />

          <BodyWeeklyWeightCard
            loading={seriesLoading}
            unit={unit}
            model={trend.weekly.model}
            weekRangeLabel={trend.weekly.weekRangeLabel}
            canGoPrevious={trend.weekly.canGoPrevious}
            canGoNext={trend.weekly.canGoNext}
            onPressPrevious={trend.weekly.onPressPrevious}
            onPressNext={trend.weekly.onPressNext}
          />

          <BodyWeightBaselineDeltaCard loading={seriesLoading} model={trend.baselineModel} />

          {trend.yearly.visible ? (
            <BodyYearlyWeightCard
              loading={seriesLoading}
              model={trend.yearly.model}
              canGoPrevious={trend.yearly.canGoPrevious}
              canGoNext={trend.yearly.canGoNext}
              onPressPrevious={trend.yearly.onPressPrevious}
              onPressNext={trend.yearly.onPressNext}
            />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title={BODY_COMPOSITION_EDUCATION_MODEL.pageTitle}
        hideTitleChrome
        compactHeader={BODY_SHOW_WEEKLY_CALENDAR_STRIP}
        {...(headerContent != null ? { headerContent } : {})}
      >
        <View style={styles.pageBody}>
          <BodyCompositionEducationScreen
            hasAnyExistingBodyMeasurement={hasAnyExistingBodyMeasurement}
            appleHealthSlot={appleHealthSlot}
            onPressAddWeight={() => setWeightLogVisible(true)}
            onPressHref={(href) => router.push(href as never)}
            onPressOpenPlan={() => router.push(BODY_COMPOSITION_EDUCATION_MODEL.planHref as never)}
            measurementsSlot={measurementsSlot}
          />
        </View>
      </ModuleScreenShell>
      <WeightLogModal
        visible={weightLogVisible}
        onClose={() => setWeightLogVisible(false)}
        onSaved={() => {
          setWeightLogVisible(false);
          void body.series.refetch({ cacheBust: `manualWeight:${Date.now()}` });
          void body.peek.refetch({ cacheBust: `manualWeightPeek:${Date.now()}` });
          void body.snapshotDayPeek.refetch({ cacheBust: `manualWeightSnapshot:${Date.now()}` });
          void body.dayFacts.refetch({ cacheBust: `manualWeight:${Date.now()}` });
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  appleHealthSlot: {
    gap: 8,
  },
  appleHealthConnectedNote: {
    gap: 8,
  },
  appleHealthConnectedText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  measurementsStack: {
    gap: 16,
  },
  syncBanner: {
    backgroundColor: SYSTEM_ACCENT_OVERLAY_10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  syncBannerText: { fontSize: 14, fontWeight: "600", color: BODY_INDIGO },
  secondaryLinkWrap: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingVertical: 4 },
  secondaryLink: { fontSize: 15, fontWeight: "600", color: BODY_INDIGO },
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
});
