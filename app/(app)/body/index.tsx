import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderIconButton } from "@/lib/ui/HeaderIconButton";
import { WorkoutsHeaderRightRow } from "@/lib/ui/headers/WorkoutsHeaderRightRow";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { BodyWeeklyStrip } from "@/lib/ui/body/BodyWeeklyStrip";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";
import { BodyLogActionSheet, type BodyLogActionAnchor } from "@/lib/ui/body/BodyLogActionSheet";
import { formatBodyDayLabel } from "@/lib/ui/body/formatBodyDayLabel";
import { formatOverviewAsOfLabel } from "@/lib/ui/body/formatOverviewAsOfLabel";
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
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useBodyCompositionInterpretation } from "@/lib/data/body/useBodyCompositionInterpretation";
import { useAppleHealthBodyAccessState } from "@/lib/data/body/useAppleHealthBodyAccessState";
import { useAppleHealthBodyBackfill } from "@/lib/data/body/useAppleHealthBodyBackfill";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { BodyAppleHealthPermissionCard } from "@/lib/ui/body/BodyAppleHealthPermissionCard";

/** @internal — tests assert on these hrefs */
export const BODY_METRIC_DETAIL_HREFS = {
  weight: "/(app)/body/metric/weight",
  bodyFat: "/(app)/body/metric/body-fat",
  bmi: "/(app)/body/metric/bmi",
  leanMass: "/(app)/body/metric/lean-mass",
  rmr: "/(app)/body/metric/rmr",
} as const;

export default function BodyOverviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentActionOpen, setRecentActionOpen] = useState(false);
  const [recentActionAnchor, setRecentActionAnchor] = useState<BodyLogActionAnchor | null>(null);
  const [selectedRecentDay, setSelectedRecentDay] = useState<string | null>(null);
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
        <WorkoutsHeaderRightRow gap={10}>
          <HeaderIconButton
            iconName="calendar-outline"
            iconSize={24}
            color={SYSTEM_ACCENT}
            accessibilityLabel="Open body calendar"
            onPress={() => router.push("/(app)/body/calendar")}
          />
          <HeaderIconButton
            label="•••"
            accessibilityLabel="Body menu"
            onPress={() => setMenuOpen(true)}
          />
        </WorkoutsHeaderRightRow>
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

  const closeRecentActionSheet = () => {
    setRecentActionOpen(false);
    setRecentActionAnchor(null);
    setSelectedRecentDay(null);
  };

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
        {menuOpen ? (
          <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)} accessibilityLabel="Close body menu">
            <View style={styles.menuCard}>
              <Text style={styles.menuTitle}>Body Composition</Text>
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/(app)/settings/devices");
                }}
                style={styles.menuAction}
                accessibilityRole="button"
                accessibilityLabel="Open devices"
              >
                <Text style={styles.menuActionText}>Devices</Text>
              </Pressable>
            </View>
          </Pressable>
        ) : null}
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
          <View style={styles.card}>
            <View style={[styles.overviewHeader, workoutOverviewInCardHeaderStyles.row]}>
              <Text style={workoutOverviewInCardHeaderStyles.title}>Overview</Text>
              {overview.overviewDay != null ? (
                <Text style={styles.asOfLabel} accessibilityLabel={`As of ${overview.overviewDay}`}>
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
              <View style={styles.todayRows}>
                {overviewRows.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => router.push(row.href as never)}
                    style={({ pressed }) => [styles.metricRowPressable, pressed && styles.metricRowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={row.a11y}
                  >
                    <View style={styles.todayRow}>
                      <View style={styles.todayRowTop}>
                        <View style={styles.metricTitleRow}>
                          <Text style={styles.metricLabel} numberOfLines={1}>
                            {row.label}
                          </Text>
                          <InterpretationRatingPill bar={row.bar} />
                        </View>
                        <Text
                          style={[
                            styles.metricValue,
                            row.value === "—" ? styles.metricValueEmpty : null,
                          ]}
                        >
                          {row.value}
                        </Text>
                      </View>
                      <InterpretationQualityBar bar={row.bar} />
                      {row.subtitle != null ? (
                        <Text style={styles.metricSubtitle}>{row.subtitle}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.recentHeader}>
              <Text style={styles.cardTitle}>Recent</Text>
            </View>
            {body.recent.length === 0 ? (
              <Text style={styles.placeholder}>No measurements yet</Text>
            ) : (
              body.recent.map((item) => (
                <Pressable
                  key={item.day}
                  style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                  onPress={() => router.push({ pathname: "/(app)/body/day/[day]", params: { day: item.day } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open body details for ${item.day}`}
                >
                  <Text style={styles.recentDate}>{formatBodyDayLabel(item.day)}</Text>
                  <View style={styles.recentMain}>
                    <Text style={styles.recentValue}>{formatBodyWeight(item.latest.weightKg, unit)}</Text>
                  </View>
                  <Pressable
                    onPress={(e: GestureResponderEvent) => {
                      e.stopPropagation();
                      const native = e.nativeEvent;
                      setRecentActionAnchor({
                        x: typeof native?.pageX === "number" ? native.pageX : 320,
                        y: typeof native?.pageY === "number" ? native.pageY : 220,
                        width: 24,
                        height: 24,
                      });
                      setSelectedRecentDay(item.day);
                      setRecentActionOpen(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Body log actions ${item.day}`}
                    hitSlop={10}
                    style={styles.rowMenuBtn}
                  >
                    <Text style={styles.rowMenuText}>•••</Text>
                  </Pressable>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ModuleScreenShell>
      <BodyLogActionSheet
        visible={recentActionOpen && selectedRecentDay != null}
        anchor={recentActionAnchor}
        onClose={closeRecentActionSheet}
        onEditLog={() => {
          closeRecentActionSheet();
        }}
        onDeleteLog={() => {
          closeRecentActionSheet();
        }}
      />
      {menuOpen ? (
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)} accessibilityLabel="Close body menu">
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Body Composition</Text>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                router.push("/(app)/settings/devices");
              }}
              style={styles.menuAction}
              accessibilityRole="button"
              accessibilityLabel="Open devices"
            >
              <Text style={styles.menuActionText}>Devices</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageBody: {
    backgroundColor: "#F2F2F7",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    gap: 20,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, gap: 12 },
  overviewHeader: {
    gap: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  asOfLabel: { fontSize: 14, fontWeight: "600", color: "#6E6E73" },
  todayRows: { gap: 10 },
  metricRowPressable: { borderRadius: 8 },
  metricRowPressed: { opacity: 0.75 },
  todayRow: { gap: 6 },
  todayRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  metricTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  metricLabel: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: "#3C3C43" },
  metricValue: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },
  metricValueEmpty: { color: "#AEAEB2", fontWeight: "600" },
  metricSubtitle: { fontSize: 12, fontWeight: "500", color: "#6E6E73", lineHeight: 16 },
  recentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  placeholder: { fontSize: 15, color: "#8E8E93" },
  recentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    paddingVertical: 12,
  },
  recentRowPressed: { opacity: 0.7 },
  recentDate: { width: 84, fontSize: 13, fontWeight: "400", color: "#8E8E93", letterSpacing: -0.1 },
  recentMain: { flex: 1, gap: 2 },
  recentValue: { fontSize: 15, fontWeight: "500", color: "#1C1C1E", letterSpacing: -0.2 },
  rowMenuBtn: { paddingHorizontal: 10, paddingVertical: 6, marginTop: -2 },
  rowMenuText: { fontSize: 18, color: "#6E6E73", fontWeight: "700" },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 24,
  },
  menuCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, gap: 12 },
  menuTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  menuAction: { paddingVertical: 10 },
  menuActionText: { fontSize: 16, fontWeight: "600", color: BODY_INDIGO },
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
