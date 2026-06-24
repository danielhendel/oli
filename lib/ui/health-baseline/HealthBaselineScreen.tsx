// lib/ui/health-baseline/HealthBaselineScreen.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { TARGET_STATE_ROUTES } from "@/lib/data/target-state/routes";
import { useHealthBaseline } from "@/lib/data/health-baseline/useHealthBaseline";
import { BaselineCategoryCard } from "@/lib/ui/health-baseline/BaselineCategoryCard";
import { HealthBaselineSummaryCard } from "@/lib/ui/health-baseline/HealthBaselineSummaryCard";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

function formatConfidence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function HealthBaselineScreen(): React.ReactElement {
  const { state, baseline, summary, errorMessage, refetch } = useHealthBaseline();
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  if (state === "signed-out") {
    return (
      <View style={styles.screen} testID="health-baseline-screen">
        <EmptyState title="Sign in required" description="Sign in to view your health baseline." />
      </View>
    );
  }

  if (state === "loading") {
    return (
      <View style={styles.screen} testID="health-baseline-screen">
        <LoadingState message="Building your health baseline…" />
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={styles.screen} testID="health-baseline-screen">
        <ErrorState
          message={errorMessage ?? "Could not load baseline data."}
          onRetry={refetch}
        />
      </View>
    );
  }

  if (baseline == null || summary == null) {
    return (
      <View style={styles.screen} testID="health-baseline-screen">
        <EmptyState title="No baseline yet" description="Connect data sources to build your baseline." />
      </View>
    );
  }

  const completeness = baseline.dataCompleteness / 100;

  return (
    <View style={styles.screen} testID="health-baseline-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Where you are today
          </Text>
          <Text style={styles.headerSubtitle}>
            A unified snapshot of your measured health data — reality, not advice.
          </Text>
        </View>

        <ProgramSectionCard title="Baseline confidence" testID="baseline-confidence-card">
          <Text style={styles.confidenceValue}>{formatConfidence(baseline.baselineConfidence)}</Text>
          <Text style={styles.confidenceHint}>
            Based on data availability, recency, and category coverage.
          </Text>
        </ProgramSectionCard>

        <ProgramSectionCard title="Data completeness" testID="baseline-completeness-card">
          <LinearProgressBar
            progress={completeness}
            trackColor={SYSTEM_ACCENT_FILL_14}
            fillColor={SYSTEM_ACCENT}
            height={8}
            testID="baseline-completeness-bar"
          />
          <Text style={styles.completenessPct}>{baseline.dataCompleteness}% of categories have data</Text>
        </ProgramSectionCard>

        <BaselineCategoryCard
          title="Body Composition"
          subtitle="Weight, body fat, lean mass, BMI"
          status={baseline.bodyComposition.status}
          metrics={baseline.bodyComposition.metrics}
          testID="baseline-body-composition"
        />
        <BaselineCategoryCard
          title="Activity"
          subtitle="Steps and daily movement"
          status={baseline.activity.status}
          metrics={baseline.activity.metrics}
          testID="baseline-activity"
        />
        <BaselineCategoryCard
          title="Strength"
          subtitle="Training frequency and volume"
          status={baseline.strength.status}
          metrics={baseline.strength.metrics}
          testID="baseline-strength"
        />
        <BaselineCategoryCard
          title="Cardio"
          subtitle="Cardio duration, distance, and heart rate"
          status={baseline.cardio.status}
          metrics={baseline.cardio.metrics}
          testID="baseline-cardio"
        />
        <BaselineCategoryCard
          title="Nutrition"
          subtitle="Calories, macros, and logging"
          status={baseline.nutrition.status}
          metrics={baseline.nutrition.metrics}
          testID="baseline-nutrition"
        />
        <BaselineCategoryCard
          title="Recovery"
          subtitle="Sleep and recovery signals"
          status={baseline.recovery.status}
          metrics={baseline.recovery.metrics}
          testID="baseline-recovery"
        />
        <BaselineCategoryCard
          title="Labs"
          subtitle="Biomarkers and lab recency"
          status={baseline.labs.status}
          metrics={baseline.labs.metrics}
          testID="baseline-labs"
        />

        <HealthBaselineSummaryCard summary={summary} />

        <Pressable
          onPress={() => router.push(TARGET_STATE_ROUTES.targetState)}
          style={({ pressed }) => [styles.targetCta, pressed && styles.targetCtaPressed]}
          accessibilityRole="button"
          accessibilityLabel="View Target State"
          testID="health-baseline-view-target-state"
        >
          <Text style={styles.targetCtaText}>View Target State</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Oli summarizes your connected data. This is not medical advice, diagnosis, or a treatment
          plan.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 16,
    gap: 16,
  },
  header: { gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: UI_TEXT_PRIMARY },
  headerSubtitle: { fontSize: 15, lineHeight: 22, color: UI_TEXT_SECONDARY },
  confidenceValue: { fontSize: 28, fontWeight: "700", color: SYSTEM_ACCENT },
  confidenceHint: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  completenessPct: { fontSize: 13, color: UI_TEXT_TERTIARY_LABEL, marginTop: 8 },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 4,
    marginBottom: 8,
  },
  targetCta: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  targetCtaPressed: { opacity: 0.9 },
  targetCtaText: { fontSize: 16, fontWeight: "700", color: UI_TEXT_PRIMARY },
});
