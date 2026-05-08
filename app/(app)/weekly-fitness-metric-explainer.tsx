import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { MetricExplainerSheetBody } from "@/components/metrics/MetricExplainerSheetBody";
import type { WeeklyFitnessExplainerRowKey } from "@/lib/metrics/weeklyFitnessMetricExplainerModel";
import {
  buildWeeklyFitnessMetricExplainerVm,
  parseWeeklyFitnessExplainerRow,
} from "@/lib/metrics/weeklyFitnessMetricExplainerModel";
import { useWeeklyFitnessCard } from "@/lib/data/dash/useWeeklyFitnessCard";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";

function WeeklyFitnessMetricExplainerInner({
  rowKey,
}: {
  rowKey: WeeklyFitnessExplainerRowKey;
}): React.ReactElement {
  const navigation = useNavigation();
  const weekly = useWeeklyFitnessCard();

  const vm = useMemo(() => {
    const row = weekly.rows.find((r) => r.key === rowKey);
    if (row == null) return null;
    return buildWeeklyFitnessMetricExplainerVm({ rowKey, row, goals: weekly.goals });
  }, [rowKey, weekly.rows, weekly.goals]);

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
