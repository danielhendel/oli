import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "expo-router";

import { buildBodyMetricTrendDetailModel } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import type { WaistLengthDisplayUnit } from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import {
  sortWaistPointsDescending,
  type WaistHistoryPoint,
} from "@/lib/data/body/waistHistoryPoints";
import { useWaistMetricHistory } from "@/lib/data/body/useWaistMetricHistory";
import { resolveUserProfileMainForInterpretation } from "@/lib/data/body/useBodyCompositionInterpretation";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import { useWaistLogMutations } from "@/lib/hooks/useWaistLogMutations";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { BodyMetricManualEntrySheet } from "@/lib/ui/body/BodyMetricManualEntrySheet";
import { BodyMetricTrendDetailView } from "@/lib/ui/body/BodyMetricTrendDetailView";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { WaistHowToMeasureExpandable } from "@/lib/ui/body/WaistHowToMeasureExpandable";
import { WaistRangeSelector } from "@/lib/ui/body/WaistRangeSelector";
import {
  formatWaistCircumference,
  formatWaistCircumferenceChange,
  formatWaistMeasuredAtLabel,
} from "@/lib/ui/body/waistDisplayFormat";
import {
  workoutsStackNavigationOptions,
  WORKOUTS_SCREEN_CONTENT_BG,
} from "@/lib/ui/headers/workoutsStackHeader";
import { MetricLogRow } from "@/lib/ui/logs/MetricLogRow";
import { MetricLogRowMenu, type MetricLogRowMenuAnchor } from "@/lib/ui/logs/MetricLogRowMenu";
import { ScreenContainer, ErrorState } from "@/lib/ui/ScreenStates";
import { UI_SCREEN_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

const WAIST_DEFAULT_RANGE: WeightRangeKey = "1Y";

function toWeightPoints(points: readonly WaistHistoryPoint[]): WeightPoint[] {
  return points.map((p) => ({
    observedAt: p.observedAt,
    dayKey: p.dayKey,
    weightKg: p.waistCm,
    sourceId: p.sourceId,
  }));
}

/**
 * Dedicated Waist detail — length units (in/cm), no classification / risk bands.
 * Chart reuses BodyMetricTrendDetailView with waistCm mapped into WeightPoint.weightKg.
 */
export default function WaistDetailScreen() {
  const navigation = useNavigation();
  const { state: profileState } = useUserProfileMain();
  const lengthUnit: WaistLengthDisplayUnit = useMemo(() => {
    const profile = resolveUserProfileMainForInterpretation(profileState);
    return profile.app.preferredUnits.length === "in" ? "in" : "cm";
  }, [profileState]);

  const [range, setRange] = useState<WeightRangeKey>(WAIST_DEFAULT_RANGE);
  const [displayUnit, setDisplayUnit] = useState<WaistLengthDisplayUnit>(lengthUnit);
  const [unitTouched, setUnitTouched] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    rawEventId: string;
    observedAtIso: string;
    waistCm: number;
  } | null>(null);
  const [menuEntry, setMenuEntry] = useState<WaistHistoryPoint | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MetricLogRowMenuAnchor | null>(null);
  const previousReadyRef = useRef<ReturnType<typeof buildBodyMetricTrendDetailModel> | null>(
    null,
  );

  const mutations = useWaistLogMutations();

  useEffect(() => {
    if (!unitTouched) setDisplayUnit(lengthUnit);
  }, [lengthUnit, unitTouched]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to Body Composition"
        />
      ),
      title: "Waist",
      headerRight: () => (
        <Pressable
          onPress={() => {
            setEditTarget(null);
            setManualEntryOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Add waist measurement"
          style={styles.headerAdd}
          testID="waist-detail-header-add"
        >
          <Text style={styles.headerAddText}>Add</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  /** Fetch all stored waist history once; client filters by selected range for the chart. */
  const history = useWaistMetricHistory("All");

  const allWeightPoints = useMemo((): WeightPoint[] => {
    if (history.status !== "ready") return [];
    return toWeightPoints(history.points);
  }, [history]);

  const model = useMemo(
    () =>
      buildBodyMetricTrendDetailModel({
        range,
        points: allWeightPoints,
        stats: { change: null, avg: null, high: null, low: null },
        trendsStatus:
          history.status === "ready"
            ? "ready"
            : history.status === "error"
              ? "error"
              : "partial",
        errorMessage: history.status === "error" ? history.error : null,
      }),
    [range, allWeightPoints, history],
  );

  useEffect(() => {
    if (model.status === "ready" || model.status === "insufficient") {
      previousReadyRef.current = model;
    }
  }, [model]);

  const listPoints = useMemo(() => {
    if (history.status !== "ready") return [];
    return sortWaistPointsDescending(history.points);
  }, [history]);

  const formatValue = useCallback(
    (waistCm: number) => formatWaistCircumference(waistCm, displayUnit),
    [displayUnit],
  );
  const formatChange = useCallback(
    (deltaCm: number) => formatWaistCircumferenceChange(deltaCm, displayUnit),
    [displayUnit],
  );

  const refresh = useCallback(() => {
    history.refetch({ cacheBust: `waist:${Date.now()}` });
  }, [history]);

  const closeMenu = useCallback(() => {
    setMenuEntry(null);
    setMenuAnchor(null);
  }, []);

  const onDelete = useCallback(
    (entry: WaistHistoryPoint) => {
      Alert.alert("Delete entry?", "Delete this waist measurement?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const res = await mutations.deleteEntry(entry.rawEventId);
              if (res.ok) refresh();
            })();
          },
        },
      ]);
    },
    [mutations, refresh],
  );

  const onEdit = useCallback((entry: WaistHistoryPoint) => {
    setEditTarget({
      rawEventId: entry.rawEventId,
      observedAtIso: entry.observedAt,
      waistCm: entry.waistCm,
    });
    setManualEntryOpen(true);
  }, []);

  if (history.status === "error" && allWeightPoints.length === 0) {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <ErrorState
          message={history.error ?? "Could not load waist history"}
          requestId={history.requestId}
          onRetry={refresh}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={[]} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        testID="waist-detail-scroll"
        keyboardShouldPersistTaps="handled"
      >
        <BodyMetricTrendDetailView
          metricTitle="Waist"
          model={model}
          range={range}
          onChangeRange={setRange}
          formatValue={formatValue}
          formatChange={formatChange}
          unitLabel={displayUnit}
          valueKind="generic"
          onRetry={refresh}
          onPressAddMeasurement={() => {
            setEditTarget(null);
            setManualEntryOpen(true);
          }}
          retainChartWhileLoading
          previousReadyModel={previousReadyRef.current}
          rangeSelector={
            <WaistRangeSelector
              value={range}
              onChange={(next) => {
                setRange(next);
              }}
            />
          }
          displayModeToggle={{
            options: [
              {
                id: "in",
                label: "in",
                accessibilityLabel: "Show waist in inches",
              },
              {
                id: "cm",
                label: "cm",
                accessibilityLabel: "Show waist in centimeters",
              },
            ],
            selected: displayUnit,
            onChange: (next) => {
              setUnitTouched(true);
              setDisplayUnit(next === "in" ? "in" : "cm");
            },
            testID: "waist-unit-toggle",
          }}
          displayModeKey={`waist:${displayUnit}`}
        />

        <WaistHowToMeasureExpandable testID="waist-detail-how-to-measure" />

        <View style={styles.historySection} testID="waist-detail-history">
          <Text style={styles.historyHeading} accessibilityRole="header">
            History
          </Text>
          {mutations.errorMessage ? (
            <View style={styles.bannerBlock}>
              <Text
                style={styles.banner}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {mutations.errorMessage}
              </Text>
              {mutations.cleanupPending ? (
                <Pressable
                  onPress={() => {
                    void (async () => {
                      const res = await mutations.retryCleanup();
                      if (res.ok) refresh();
                    })();
                  }}
                  style={styles.retryCleanupBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Retry cleanup"
                  testID="waist-detail-retry-cleanup"
                >
                  <Text style={styles.retryCleanupText}>Retry cleanup</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {listPoints.length === 0 && history.status === "ready" ? (
            <Text style={styles.emptyHistory} testID="waist-detail-history-empty">
              No waist measurements yet.
            </Text>
          ) : null}
          {listPoints.map((entry) => (
            <MetricLogRow
              key={entry.rawEventId}
              testID={`waist-history-row-${entry.rawEventId}`}
              dateLabel={formatWaistMeasuredAtLabel(entry.observedAt)}
              primaryMetric={formatWaistCircumference(entry.waistCm, displayUnit)}
              secondaryMetric={entry.sourceId === "manual" ? "Manual" : entry.sourceId}
              accessibilityLabel={`Waist ${formatWaistCircumference(entry.waistCm, displayUnit)} on ${formatWaistMeasuredAtLabel(entry.observedAt)}`}
              onOpenMenu={(anchor) => {
                setMenuEntry(entry);
                setMenuAnchor(anchor);
              }}
            />
          ))}
        </View>
      </ScrollView>

      <MetricLogRowMenu
        visible={menuEntry != null}
        anchor={menuAnchor}
        onClose={closeMenu}
        onEdit={() => {
          if (menuEntry) onEdit(menuEntry);
        }}
        onDelete={() => {
          if (menuEntry) onDelete(menuEntry);
        }}
        editDisabledReason={null}
        deleteDisabledReason={null}
      />

      <BodyMetricManualEntrySheet
        visible={manualEntryOpen}
        metric="waist"
        editTarget={editTarget}
        lengthUnitDefault={displayUnit}
        onClose={() => {
          setManualEntryOpen(false);
          setEditTarget(null);
        }}
        onSaved={() => {
          setManualEntryOpen(false);
          setEditTarget(null);
          refresh();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
    backgroundColor: UI_SCREEN_BG,
  },
  headerAdd: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddText: {
    color: BODY_INDIGO,
    fontSize: 16,
    fontWeight: "700",
  },
  historySection: {
    gap: 4,
    paddingTop: 8,
  },
  historyHeading: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyHistory: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    paddingVertical: 12,
  },
  banner: {
    color: "#FF8A80",
    fontSize: 13,
    fontWeight: "600",
  },
  bannerBlock: {
    gap: 8,
    marginBottom: 8,
  },
  retryCleanupBtn: {
    minHeight: 44,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(79,70,229,0.18)",
  },
  retryCleanupText: {
    color: BODY_INDIGO,
    fontSize: 14,
    fontWeight: "700",
  },
});
