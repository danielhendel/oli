// lib/ui/target-state/TargetStateScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTargetState } from "@/lib/data/target-state/useTargetState";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { TargetStateDomainCard } from "@/lib/ui/target-state/TargetStateDomainCard";
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

export function TargetStateScreen(): React.ReactElement {
  const { state, roadmap, summary, errorMessage, refetch } = useTargetState();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  if (state === "signed-out") {
    return (
      <View style={styles.screen} testID="target-state-screen">
        <EmptyState title="Sign in required" description="Sign in to view your target state roadmap." />
      </View>
    );
  }

  if (state === "loading") {
    return (
      <View style={styles.screen} testID="target-state-screen">
        <LoadingState message="Building your target state roadmap…" />
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={styles.screen} testID="target-state-screen">
        <ErrorState message={errorMessage ?? "Could not load target state."} onRetry={refetch} />
      </View>
    );
  }

  if (roadmap == null || summary == null || roadmap.domains.length === 0) {
    return (
      <View style={styles.screen} testID="target-state-screen">
        <EmptyState
          title="Baseline data needed"
          description="Complete your health baseline with measured data to generate classification-based targets."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="target-state-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Evidence-based target state
          </Text>
          <Text style={styles.headerSubtitle}>{summary.headline}</Text>
        </View>

        <ProgramSectionCard title="Target state confidence" testID="target-state-confidence">
          <Text style={styles.confidenceValue}>
            {formatConfidence(roadmap.targetStateConfidence)}
          </Text>
          <Text style={styles.hint}>Based on classification data coverage from your baseline.</Text>
        </ProgramSectionCard>

        <ProgramSectionCard title="Data coverage" testID="target-state-coverage">
          <LinearProgressBar
            progress={roadmap.dataCoveragePercent / 100}
            trackColor={SYSTEM_ACCENT_FILL_14}
            fillColor={SYSTEM_ACCENT}
            height={8}
          />
          <Text style={styles.coveragePct}>
            {roadmap.dataCoveragePercent}% of classification metrics have baseline data
          </Text>
        </ProgramSectionCard>

        {summary.primaryGoalAlignment != null ? (
          <ProgramSectionCard title="Primary goal alignment" testID="target-state-goal">
            <Text style={styles.bodyText}>{summary.primaryGoalAlignment}</Text>
            <Text style={styles.priorityOrder}>
              Domain order: {summary.prioritizedDomainTitles.join(" → ")}
            </Text>
          </ProgramSectionCard>
        ) : null}

        {roadmap.domains.map((domain) => (
          <TargetStateDomainCard key={domain.domain} domain={domain} />
        ))}

        <ProgramSectionCard title="Roadmap summary" testID="target-state-summary">
          {summary.metricsWithMovementPotential.length > 0 ? (
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryHeading}>Progression focus</Text>
              {summary.metricsWithMovementPotential.map((line) => (
                <Text key={line} style={styles.bullet}>
                  • {line}
                </Text>
              ))}
            </View>
          ) : null}
          {summary.metricsNeedingData.length > 0 ? (
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryHeading}>Needs baseline data</Text>
              {summary.metricsNeedingData.map((line) => (
                <Text key={line} style={styles.bullet}>
                  • {line}
                </Text>
              ))}
            </View>
          ) : null}
        </ProgramSectionCard>

        <Text style={styles.disclaimer}>{summary.disclaimer}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  content: { paddingHorizontal: UI_TAB_ROOT_INSET, paddingTop: 16, gap: 16 },
  header: { gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: UI_TEXT_PRIMARY },
  headerSubtitle: { fontSize: 15, lineHeight: 22, color: UI_TEXT_SECONDARY },
  confidenceValue: { fontSize: 28, fontWeight: "700", color: SYSTEM_ACCENT },
  hint: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  coveragePct: { fontSize: 13, color: UI_TEXT_TERTIARY_LABEL, marginTop: 8 },
  bodyText: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  priorityOrder: { fontSize: 13, lineHeight: 18, color: UI_TEXT_TERTIARY_LABEL, marginTop: 8 },
  summaryBlock: { marginBottom: 10, gap: 4 },
  summaryHeading: { fontSize: 14, fontWeight: "700", color: UI_TEXT_PRIMARY },
  bullet: { fontSize: 13, lineHeight: 18, color: UI_TEXT_SECONDARY },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 4,
    marginBottom: 8,
  },
});
