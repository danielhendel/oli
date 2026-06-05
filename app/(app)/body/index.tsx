import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { BodyWeeklyStrip } from "@/lib/ui/body/BodyWeeklyStrip";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";
import { BodyAppleHealthPermissionCard } from "@/lib/ui/body/BodyAppleHealthPermissionCard";
import { BodyTodayCard } from "@/lib/ui/body/BodyTodayCard";
import { BodyWeeklyWeightCard } from "@/lib/ui/body/BodyWeeklyWeightCard";
import { BodyWeightBaselineDeltaCard } from "@/lib/ui/body/BodyWeightBaselineDeltaCard";
import { BodyYearlyWeightCard } from "@/lib/ui/body/BodyYearlyWeightCard";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useAppleHealthBodyAccessState } from "@/lib/data/body/useAppleHealthBodyAccessState";
import { useAppleHealthBodyBackfill } from "@/lib/data/body/useAppleHealthBodyBackfill";
import { useBodyWeightTrendCards } from "@/lib/data/body/useBodyWeightTrendCards";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

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

  const showPermissionGate =
    access.phase === "not_determined" ||
    access.phase === "denied" ||
    access.phase === "unavailable";
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
      title: "Body Composition",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          gap={10}
          calendarAccessibilityLabel="Open body calendar"
          onCalendarPress={() => router.push("/(app)/body/calendar")}
          overflowAccessibilityLabel="Body settings"
          onOverflowPress={() => router.push("/(app)/body/settings")}
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

  if (body.series.status === "error") {
    return (
      <ModuleScreenShell
        title="Body Composition"
        hideTitleChrome
        compactHeader={BODY_SHOW_WEEKLY_CALENDAR_STRIP}
        {...(headerContent != null ? { headerContent } : {})}
      >
        <ErrorState
          message={body.series.error}
          requestId={body.series.requestId}
          onRetry={() => body.series.refetch()}
        />
      </ModuleScreenShell>
    );
  }

  if (showPermissionGate) {
    const unavailableMsg =
      access.authSnapshot?.kind === "unavailable" ? access.authSnapshot.error : undefined;
    return (
      <View style={styles.root}>
        <ModuleScreenShell
          title="Body Composition"
          hideTitleChrome
          compactHeader={BODY_SHOW_WEEKLY_CALENDAR_STRIP}
          {...(headerContent != null ? { headerContent } : {})}
        >
          <View style={styles.pageBody}>
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
        </ModuleScreenShell>
      </View>
    );
  }

  const todayEmptyTitle =
    access.phase === "granted_no_data" ? "No body measurements yet" : "No body data yet";
  const todayEmptyDescription =
    access.phase === "granted_no_data"
      ? "Add a measurement in Apple Health or sync a connected source. Open Body again after your data updates."
      : "When Apple Health has body data, your latest snapshot will appear here.";

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title="Body Composition"
        hideTitleChrome
        compactHeader={BODY_SHOW_WEEKLY_CALENDAR_STRIP}
        {...(headerContent != null ? { headerContent } : {})}
      >
        <View style={styles.pageBody}>
          {access.phase === "syncing" ? (
            <View style={styles.syncBanner}>
              <Text style={styles.syncBannerText}>Syncing Apple Health…</Text>
            </View>
          ) : null}

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
        </View>
      </ModuleScreenShell>
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
  syncBanner: {
    backgroundColor: SYSTEM_ACCENT_OVERLAY_10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  syncBannerText: { fontSize: 14, fontWeight: "600", color: BODY_INDIGO },
  secondaryLinkWrap: { alignSelf: "flex-start", paddingVertical: 4 },
  secondaryLink: { fontSize: 15, fontWeight: "600", color: BODY_INDIGO },
});
