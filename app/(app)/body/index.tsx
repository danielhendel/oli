import React, { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { BodyWeeklyStrip } from "@/lib/ui/body/BodyWeeklyStrip";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";
import { formatOverviewAsOfLabel } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import {
  formatBodyBmi,
  formatBodyLeanMass,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";
import {
  InterpretationQualityBar,
  interpretationBarAccessibilityLabel,
} from "@/lib/ui/body/InterpretationQualityBar";
import { InterpretationRatingPill } from "@/lib/ui/body/InterpretationRatingPill";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useBodyCompositionInterpretation } from "@/lib/data/body/useBodyCompositionInterpretation";
import { useAppleHealthBodyAccessState } from "@/lib/data/body/useAppleHealthBodyAccessState";
import { useAppleHealthBodyBackfill } from "@/lib/data/body/useAppleHealthBodyBackfill";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { rollingLookbackWindowForAnchorDay } from "@/lib/data/body/bodyHistoryRange";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { BodyAppleHealthPermissionCard } from "@/lib/ui/body/BodyAppleHealthPermissionCard";
import { WeightBaselineCard } from "@/lib/ui/body/WeightBaselineCard";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

import { UI_CARD_SURFACE, UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

/** @internal — tests assert on these hrefs */
export const BODY_METRIC_DETAIL_HREFS = BODY_COMPOSITION_METRIC_DETAIL_ROUTES;

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

  const overviewLoading = body.series.status === "partial" || body.peek.status === "partial";
  const overviewError =
    body.series.status === "error"
      ? { message: body.series.error, requestId: body.series.requestId, retry: () => body.series.refetch() }
      : body.peek.status === "error"
        ? { message: body.peek.error, requestId: body.peek.requestId, retry: () => body.peek.refetch() }
        : null;

  const { overview } = body;
  const baselineChartPoints = useMemo(() => {
    const anchor = overview.overviewDay ?? body.today;
    const bounds = rollingLookbackWindowForAnchorDay(anchor, 90);
    const pts = Array.from(body.byDay.values())
      .flatMap((arr) => arr)
      .filter((p) => p.dayKey >= bounds.start && p.dayKey <= bounds.end)
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
      .map((p) => ({ observedAt: p.observedAt, weightKg: p.weightKg }));
    return pts;
  }, [body.byDay, body.today, overview.overviewDay]);
  const compositionIx = useBodyCompositionInterpretation(overview);
  const overviewRows = useMemo(
    () => [
      {
        id: "weight",
        href: BODY_METRIC_DETAIL_HREFS.weight,
        label: "Weight",
        value: overview.weightKg != null ? formatBodyWeight(overview.weightKg, unit) : "—",
        bar: compositionIx.weight.bar,
        subtitle: compositionIx.weight.subtitle,
        a11y:
          compositionIx.weight.subtitle != null
            ? `Open weight details. ${compositionIx.weight.subtitle}. ${interpretationBarAccessibilityLabel(compositionIx.weight.bar, "Weight")}`
            : `Open weight details. ${interpretationBarAccessibilityLabel(compositionIx.weight.bar, "Weight")}`,
      },
      {
        id: "bmi",
        href: BODY_METRIC_DETAIL_HREFS.bmi,
        label: "BMI",
        value: overview.bmi != null ? formatBodyBmi(overview.bmi) : "—",
        bar: compositionIx.bmi.bar,
        subtitle: compositionIx.bmi.subtitle,
        a11y:
          compositionIx.bmi.subtitle != null
            ? `Open BMI details. ${compositionIx.bmi.subtitle}. ${interpretationBarAccessibilityLabel(compositionIx.bmi.bar, "BMI")}`
            : `Open BMI details. ${interpretationBarAccessibilityLabel(compositionIx.bmi.bar, "BMI")}`,
      },
      {
        id: "body-fat",
        href: BODY_METRIC_DETAIL_HREFS.bodyFat,
        label: "Body Fat",
        value: overview.bodyFatPercent != null ? `${overview.bodyFatPercent.toFixed(1)}%` : "—",
        bar: compositionIx.bodyFat.bar,
        subtitle: compositionIx.bodyFat.subtitle,
        a11y:
          compositionIx.bodyFat.subtitle != null
            ? `Open body fat details. ${compositionIx.bodyFat.subtitle}. ${interpretationBarAccessibilityLabel(compositionIx.bodyFat.bar, "Body Fat")}`
            : `Open body fat details. ${interpretationBarAccessibilityLabel(compositionIx.bodyFat.bar, "Body Fat")}`,
      },
      {
        id: "lean",
        href: BODY_METRIC_DETAIL_HREFS.leanMass,
        label: "Lean Body Mass",
        value: overview.leanBodyMassKg != null ? formatBodyLeanMass(overview.leanBodyMassKg, unit) : "—",
        bar: compositionIx.lean.bar,
        subtitle: compositionIx.lean.subtitle,
        a11y:
          compositionIx.lean.subtitle != null
            ? `Open lean body mass details. ${compositionIx.lean.subtitle}. ${interpretationBarAccessibilityLabel(compositionIx.lean.bar, "Lean Body Mass")}`
            : `Open lean body mass details. ${interpretationBarAccessibilityLabel(compositionIx.lean.bar, "Lean Body Mass")}`,
      },
    ],
    [overview, unit, compositionIx],
  );

  if (body.series.status === "error") {
    return (
      <ModuleScreenShell
        title="Body Composition"
        hideTitleChrome
        compactHeader
        headerContent={
          <BodyWeeklyStrip
            days={body.weekDays}
            selectedDay={body.today}
            onDayPress={(day) => router.push({ pathname: "/(app)/body/day/[day]", params: { day } })}
          />
        }
      >
        <ErrorState message={body.series.error} requestId={body.series.requestId} onRetry={() => body.series.refetch()} />
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
          compactHeader
          headerContent={
            <BodyWeeklyStrip
              days={body.weekDays}
              selectedDay={body.today}
              onDayPress={(day) => router.push({ pathname: "/(app)/body/day/[day]", params: { day } })}
            />
          }
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

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title="Body Composition"
        hideTitleChrome
        compactHeader
        headerContent={
          <BodyWeeklyStrip
            days={body.weekDays}
            selectedDay={body.today}
            onDayPress={(day) => router.push({ pathname: "/(app)/body/day/[day]", params: { day } })}
          />
        }
      >
        <View style={styles.pageBody}>
          {access.phase === "syncing" ? (
            <View style={styles.syncBanner}>
              <Text style={styles.syncBannerText}>Syncing Apple Health…</Text>
            </View>
          ) : null}
          <WeightBaselineCard
            unit={unit}
            loading={body.weightBaseline.status === "partial"}
            error={null}
            model={body.weightBaseline.status === "ready" ? body.weightBaseline.model : null}
            chartPoints={baselineChartPoints}
          />
          <View style={styles.card}>
            <View style={[styles.overviewHeader, workoutOverviewInCardHeaderStyles.row]}>
              <Text style={styles.cardTitle}>Body Composition</Text>
              {overview.overviewDay != null ? (
                <Text style={styles.asOfLabel} accessibilityLabel={formatOverviewAsOfLabel(overview.overviewDay)}>
                  {formatOverviewAsOfLabel(overview.overviewDay)}
                </Text>
              ) : null}
            </View>
            {overviewLoading ? (
              <LoadingState message="Loading overview…" />
            ) : overviewError ? (
              <ErrorState
                message={overviewError.message}
                requestId={overviewError.requestId}
                onRetry={overviewError.retry}
              />
            ) : !overview.hasAnyMetric ? (
              <EmptyState
                title={access.phase === "granted_no_data" ? "No body measurements yet" : "No overview data yet"}
                description={
                  access.phase === "granted_no_data"
                    ? "Add a measurement in Apple Health or sync a connected source. Open Body again after your data updates."
                    : "When Apple Health has body data, your latest snapshot will appear here."
                }
              />
            ) : (
              <View style={moduleOverviewMetricLayoutStyles.metricGroups}>
                {overviewRows.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => router.push(row.href as never)}
                    style={({ pressed }) => [styles.metricRowPressable, pressed && styles.metricRowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={row.a11y}
                  >
                    <View style={moduleOverviewMetricLayoutStyles.metricBlock}>
                      <View style={moduleOverviewMetricLayoutStyles.topRow}>
                        <View style={styles.bodyMetricLeftGroup}>
                          <Text style={styles.bodyMetricLabel} numberOfLines={1}>
                            {row.label}
                          </Text>
                          <InterpretationRatingPill bar={row.bar} shellStyle={styles.bodyRatingPillInline} />
                        </View>
                        <Text
                          style={[
                            styles.bodyMetricValue,
                            row.value === "—" ? styles.bodyMetricValueEmpty : null,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {row.value}
                        </Text>
                      </View>
                      <InterpretationQualityBar bar={row.bar} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
    paddingBottom: 80,
    gap: 20,
  },
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  overviewHeader: {
    gap: 8,
    alignItems: "flex-start",
    paddingBottom: 2,
  },
  cardTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.34,
  },
  asOfLabel: { fontSize: 12, fontWeight: "500", color: "#8E8E93" },
  metricRowPressable: { borderRadius: 8 },
  metricRowPressed: { opacity: 0.75 },
  bodyMetricLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    paddingRight: 10,
  },
  bodyMetricLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  bodyMetricValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.22,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
    maxWidth: "40%",
    textAlign: "right",
  },
  bodyMetricValueEmpty: {
    color: "#AEAEB2",
    fontWeight: "600",
  },
  bodyRatingPillInline: {
    flexShrink: 0,
    maxWidth: "45%",
    alignSelf: "baseline",
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
