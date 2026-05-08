import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { DottedRangeLegendList } from "@/components/metrics/DottedRangeLegendList";
import {
  buildBodyMetricRangesExplainerVm,
  parseBodyMetricRangesExplainerMetric,
} from "@/lib/body/buildBodyMetricRangesExplainerModel";
import {
  resolveUserProfileMainForInterpretation,
  useBodyCompositionInterpretation,
} from "@/lib/data/body/useBodyCompositionInterpretation";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { MetricRangesExplainerLayout } from "@/lib/ui/metrics/MetricRangesExplainerLayout";
import { rangeExplainerSheetStyles as sheetStyles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";

export default function BodyMetricRangesExplainerScreen(): React.ReactElement {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ metric?: string }>();
  const metric = parseBodyMetricRangesExplainerMetric(params.metric);

  useEffect(() => {
    if (metric == null) router.back();
  }, [metric, router]);

  const body = useBodyOverviewData();
  const profileState = useUserProfileMain();
  const profile = useMemo(
    () => resolveUserProfileMainForInterpretation(profileState.state),
    [profileState.state],
  );
  const { state: prefState } = usePreferences();
  const massUnit = prefState.preferences.units.mass;

  const overviewMetrics = useMemo(
    () => ({
      weightKg: body.overview.weightKg,
      bodyFatPercent: body.overview.bodyFatPercent,
      bmi: body.overview.bmi,
      leanBodyMassKg: body.overview.leanBodyMassKg,
      restingMetabolicRateKcal: body.overview.restingMetabolicRateKcal,
    }),
    [
      body.overview.weightKg,
      body.overview.bodyFatPercent,
      body.overview.bmi,
      body.overview.leanBodyMassKg,
      body.overview.restingMetabolicRateKcal,
    ],
  );

  const interpretations = useBodyCompositionInterpretation(overviewMetrics);

  const vm = useMemo(() => {
    if (metric == null) return null;
    return buildBodyMetricRangesExplainerVm(metric, {
      profile,
      overview: overviewMetrics,
      interpretations,
      massUnit,
    });
  }, [metric, profile, overviewMetrics, interpretations, massUnit]);

  useEffect(() => {
    if (vm?.title) {
      navigation.setOptions({ title: vm.title });
    }
  }, [navigation, vm?.title]);

  if (metric == null) {
    return <View />;
  }

  const overviewLoading = body.series.status === "partial" || body.peek.status === "partial";
  const overviewError =
    body.series.status === "error"
      ? body.series.error
      : body.peek.status === "error"
        ? body.peek.error
        : null;

  if (overviewLoading) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState message="Loading body composition…" />
      </View>
    );
  }

  if (overviewError != null) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <ErrorState variant="inline" title="Could not load ranges" message={overviewError} />
      </View>
    );
  }

  if (!body.overview.hasAnyMetric) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <EmptyState title="No body data yet" description="Add a measurement to see range details." />
      </View>
    );
  }

  if (vm == null) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <EmptyState title="Nothing to show" description="This metric is unavailable." />
      </View>
    );
  }

  const readingA11yLabel = [
    "Your reading.",
    vm.reading.valueLine,
    vm.reading.classificationLine,
    vm.reading.interpretationLine,
  ].join(" ");

  const metricExplainerA11yLabel = [vm.metricExplainer.title, ...vm.metricExplainer.paragraphs].join(
    " ",
  );

  return (
    <MetricRangesExplainerLayout
      readingSlot={
        <View
          style={sheetStyles.personalCard}
          accessibilityRole="summary"
          accessibilityLabel={readingA11yLabel}
        >
          <Text style={sheetStyles.personalHeading}>Your reading</Text>
          <Text style={sheetStyles.personalLine}>{vm.reading.valueLine}</Text>
          <Text style={sheetStyles.personalLine}>{vm.reading.classificationLine}</Text>
          <Text style={sheetStyles.personalValue}>{vm.reading.interpretationLine}</Text>
        </View>
      }
      metricExplainerSlot={
        <View accessibilityRole="text" accessibilityLabel={metricExplainerA11yLabel}>
          <Text style={sheetStyles.metricExplainerTitle}>{vm.metricExplainer.title}</Text>
          {vm.metricExplainer.paragraphs.map((paragraph, i) => (
            <Text key={`mx-${metric}-${i}`} style={sheetStyles.metricExplainerParagraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      }
      legendHeading={vm.rangeLegend.heading}
      legendSlot={
        <DottedRangeLegendList
          rows={vm.rangeLegend.rows}
          listTestID={`body-metric-ranges-${metric}-legend`}
          rowTestID={(key) => `body-metric-ranges-${metric}-legend-row-${key}`}
          dotTestID={(key) => `body-metric-ranges-${metric}-legend-dot-${key}`}
        />
      }
      sectionHeading={vm.rangeMeaningsHeading}
      tiers={vm.tiers}
      scrollTestID={`body-metric-ranges-${metric}-scroll`}
    />
  );
}
