import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyWeeklyStrip } from "@/lib/ui/body/BodyWeeklyStrip";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { BodyAppleHealthPermissionCard } from "@/lib/ui/body/BodyAppleHealthPermissionCard";
import { BodyCompositionSummaryScreen } from "@/lib/ui/body/BodyCompositionSummaryScreen";
import { WeightLogModal } from "@/lib/ui/WeightLogModal";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useAppleHealthBodyAccessState } from "@/lib/data/body/useAppleHealthBodyAccessState";
import { useAppleHealthBodyBackfill } from "@/lib/data/body/useAppleHealthBodyBackfill";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import {
  BODY_COMPOSITION_SUMMARY_COPY,
  buildBodyMetricSummaryCards,
} from "@/lib/body/presentation/buildBodyMetricSummaryCards";
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
      title: BODY_COMPOSITION_SUMMARY_COPY.pageTitle,
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
  const cards = useMemo(
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
      >
        <View style={styles.pageBody}>
          <BodyCompositionSummaryScreen
            cards={cards}
            appleHealthSlot={appleHealthSlot}
            onPressCard={(href) => router.push(href as never)}
            onPressAddWeight={() => setWeightLogVisible(true)}
            onPressHref={(href) => router.push(href as never)}
            measurementErrorSlot={measurementErrorSlot}
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
    paddingTop: 12,
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
  secondaryLinkWrap: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 4,
  },
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
  syncBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(58,91,219,0.1)",
  },
  syncBannerText: { fontSize: 14, fontWeight: "600", color: BODY_INDIGO },
});
