import React, { useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { MetricExplainerSheetBody } from "@/components/metrics/MetricExplainerSheetBody";
import { buildActivityHistorySummaryModel } from "@/lib/data/activity/activityHistorySummaryModel";
import type { WeeklyFitnessExplainerRowKey } from "@/lib/metrics/weeklyFitnessMetricExplainerModel";
import {
  buildWeeklyFitnessMetricExplainerVm,
  parseWeeklyFitnessExplainerRow,
} from "@/lib/metrics/weeklyFitnessMetricExplainerModel";
import { useWeeklyFitnessCard } from "@/lib/data/dash/useWeeklyFitnessCard";
import { buildCardioHistorySummaryModel } from "@/lib/data/workouts/cardioHistorySummaryModel";
import { buildStrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import { ActivityHistorySummaryCard } from "@/lib/ui/activity/ActivityHistorySummaryCard";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { CardioHistorySummaryCard } from "@/lib/ui/workouts/CardioHistorySummaryCard";
import { StrengthHistorySummaryCard } from "@/lib/ui/workouts/StrengthHistorySummaryCard";

function WeeklyFitnessMetricExplainerInner({
  rowKey,
}: {
  rowKey: WeeklyFitnessExplainerRowKey;
}): React.ReactElement {
  const navigation = useNavigation();
  const router = useRouter();
  const weekly = useWeeklyFitnessCard();
  const activityHistorySummaryModel = useMemo(() => {
    return buildActivityHistorySummaryModel({
      todayDayKey: weekly.baselineSource.todayDayKey,
      rollupByDay: weekly.baselineSource.rollupByDay,
    });
  }, [weekly.baselineSource.todayDayKey, weekly.baselineSource.rollupByDay]);
  const strengthHistorySummaryModel = useMemo(() => {
    return buildStrengthHistorySummaryModel({
      strengthCalendarDays: weekly.baselineSource.strengthCalendarDays,
      todayDayKey: weekly.baselineSource.todayDayKey,
      availableRangeStart: weekly.baselineSource.availableRangeStart,
      availableRangeEnd: weekly.baselineSource.availableRangeEnd,
    });
  }, [
    weekly.baselineSource.availableRangeEnd,
    weekly.baselineSource.availableRangeStart,
    weekly.baselineSource.strengthCalendarDays,
    weekly.baselineSource.todayDayKey,
  ]);
  const cardioHistorySummaryModel = useMemo(() => {
    return buildCardioHistorySummaryModel({
      cardioCalendarDays: weekly.baselineSource.cardioCalendarDays,
      todayDayKey: weekly.baselineSource.todayDayKey,
      availableRangeStart: weekly.baselineSource.availableRangeStart,
      availableRangeEnd: weekly.baselineSource.availableRangeEnd,
    });
  }, [
    weekly.baselineSource.availableRangeEnd,
    weekly.baselineSource.availableRangeStart,
    weekly.baselineSource.cardioCalendarDays,
    weekly.baselineSource.todayDayKey,
  ]);

  const onPressViewMore = useCallback(
    (target: "/(app)/activity/analytics" | "/(app)/workouts/analytics-detail" | "/(app)/cardio/analytics-detail") => {
      router.replace(target);
    },
    [router],
  );

  const baselineSlot = useMemo(() => {
    if (rowKey === "activity") {
      return (
        <ActivityHistorySummaryCard
          model={activityHistorySummaryModel}
          onPressViewMore={() => onPressViewMore("/(app)/activity/analytics")}
          onPressActivityRangeExplainer={(ctx) =>
            router.push({
              pathname: "/(app)/activity/activity-range-explainer",
              params: {
                window: ctx.rowLabel,
                tierIndex: String(ctx.tierIndexForBar),
                tierLabel: ctx.tierLabel,
                displayValue: ctx.displayValue,
                ...(ctx.averageStepsPerDay != null && Number.isFinite(ctx.averageStepsPerDay)
                  ? { avgSteps: String(Math.round(ctx.averageStepsPerDay)) }
                  : {}),
              },
            })
          }
        />
      );
    }
    if (rowKey === "strength") {
      return (
        <StrengthHistorySummaryCard
          model={strengthHistorySummaryModel}
          onPressViewMore={() => onPressViewMore("/(app)/workouts/analytics-detail")}
          onPressStrengthRangeExplainer={(ctx) =>
            router.push({
              pathname: "/(app)/workouts/strength-range-explainer",
              params: {
                avg:
                  ctx.averageSessionsPerWeek != null && Number.isFinite(ctx.averageSessionsPerWeek)
                    ? String(ctx.averageSessionsPerWeek)
                    : "",
                window: ctx.rowLabel,
                tierBand: String(ctx.tierIndexForBar),
                tierLabel: ctx.tierLabel,
              },
            })
          }
        />
      );
    }
    return (
      <CardioHistorySummaryCard
        model={cardioHistorySummaryModel}
        onPressViewMore={() => onPressViewMore("/(app)/cardio/analytics-detail")}
        onPressCardioRangeExplainer={(ctx) =>
          router.push({
            pathname: "/(app)/cardio/cardio-range-explainer",
            params: {
              window: ctx.rowLabel,
              tierIndex: String(ctx.tierIndexForBar),
              tierLabel: ctx.tierLabel,
              displayValue: ctx.displayValue,
            },
          })
        }
      />
    );
  }, [
    activityHistorySummaryModel,
    cardioHistorySummaryModel,
    onPressViewMore,
    rowKey,
    router,
    strengthHistorySummaryModel,
  ]);

  const vm = useMemo(() => {
    const row = weekly.rows.find((r) => r.key === rowKey);
    if (row == null) return null;
    return {
      ...buildWeeklyFitnessMetricExplainerVm({ rowKey, row, goals: weekly.goals }),
      baselineSlot,
    };
  }, [baselineSlot, rowKey, weekly.rows, weekly.goals]);

  useEffect(() => {
    if (vm?.navigationTitle) {
      navigation.setOptions({ title: vm.navigationTitle });
    }
  }, [navigation, vm?.navigationTitle]);

  if (weekly.loading) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState message="Loading weekly fitness…" />
      </View>
    );
  }

  if (weekly.error != null) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <ErrorState variant="inline" title="Could not load weekly fitness" message={weekly.error} />
      </View>
    );
  }

  if (vm == null) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <EmptyState title="Nothing to show" description="This row isn’t available." />
      </View>
    );
  }

  const legendPrefix = `weekly-fitness-explainer-${rowKey}`;

  return (
    <MetricExplainerSheetBody
      vm={vm}
      scrollTestID={`${legendPrefix}-scroll`}
      legendTestIdPrefix={legendPrefix}
    />
  );
}

export default function WeeklyFitnessMetricExplainerModal(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ row?: string }>();
  const rowKey = parseWeeklyFitnessExplainerRow(params.row);

  useEffect(() => {
    if (rowKey == null) router.back();
  }, [rowKey, router]);

  if (rowKey == null) {
    return <View />;
  }

  return <WeeklyFitnessMetricExplainerInner rowKey={rowKey} />;
}
