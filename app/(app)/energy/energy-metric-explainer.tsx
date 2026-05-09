import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { MetricExplainerSheetBody } from "@/components/metrics/MetricExplainerSheetBody";
import type { DailyEnergyExplainerMetricKey } from "@/lib/metrics/dailyEnergyMetricExplainerModel";
import {
  buildDailyEnergyMetricExplainerVm,
  collectDailyEnergyExplainerContext,
  parseDailyEnergyExplainerMetric,
} from "@/lib/metrics/dailyEnergyMetricExplainerModel";
import type { DailyFactsDto } from "@/lib/contracts";
import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";

function EnergyMetricExplainerInner({
  metric,
  day,
}: {
  metric: DailyEnergyExplainerMetricKey;
  day: string;
}): React.ReactElement {
  const navigation = useNavigation();
  const { energy, loading: energyLoading, error: energyError } = useDailyEnergyCard(day);
  const facts = useDailyFacts(day);
  const factsData = facts.status === "ready" ? (facts.data as DailyFactsDto) : undefined;

  const vm = useMemo(() => {
    if (energy == null) return null;
    const ctx = collectDailyEnergyExplainerContext({
      metric,
      energy,
      facts: factsData,
    });
    if (ctx == null) return null;
    return buildDailyEnergyMetricExplainerVm({ metric, ctx });
  }, [metric, energy, factsData]);

  useEffect(() => {
    if (vm?.navigationTitle) {
      navigation.setOptions({ title: vm.navigationTitle });
    }
  }, [navigation, vm?.navigationTitle]);

  const loading = energyLoading || facts.status === "partial";

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState message="Loading daily energy…" />
      </View>
    );
  }

  if (energyError != null) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <ErrorState variant="inline" title="Could not load energy" message={energyError} />
      </View>
    );
  }

  if (energy == null || vm == null) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <EmptyState title="Nothing to show" description="This contribution isn’t available for this day." />
      </View>
    );
  }

  const legendPrefix = `energy-explainer-${metric}-${day}`;

  return (
    <MetricExplainerSheetBody
      vm={vm}
      scrollTestID={`${legendPrefix}-scroll`}
      legendTestIdPrefix={legendPrefix}
    />
  );
}

export default function EnergyMetricExplainerModal(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ metric?: string; day?: string }>();
  const metric = parseDailyEnergyExplainerMetric(params.metric);
  const day = typeof params.day === "string" && params.day.length > 0 ? params.day : null;

  useEffect(() => {
    if (metric == null || day == null) router.back();
  }, [metric, day, router]);

  if (metric == null || day == null) {
    return <View />;
  }

  return <EnergyMetricExplainerInner metric={metric} day={day} />;
}
