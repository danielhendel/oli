import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TodayCommandModel } from "@/lib/today/types";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { TodayProgressCard } from "@/lib/ui/today/TodayProgressCard";
import { TodayReadinessSummary } from "@/lib/ui/today/TodayReadinessSummary";
import { TodaySemiCircleProgress } from "@/lib/ui/today/TodaySemiCircleProgress";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  model: TodayCommandModel | null;
  loading: boolean;
  error: string | null;
  /** Dash hero date line rendered under completion percent. */
  dateLine?: string | null;
};

export function TodayCommandSection({ model, loading, error, dateLine }: Props): React.ReactElement {
  if (error != null && !loading) {
    return (
      <View style={styles.wrap} testID="today-command-error">
        <ErrorState variant="inline" title="Could not load today's plan" message={error} />
      </View>
    );
  }

  if (!loading && model == null) {
    return (
      <View style={styles.wrap} testID="today-command-empty">
        <Text style={styles.emptyCopy}>Sign in to see today's plan and readiness.</Text>
      </View>
    );
  }

  const completion = model?.completionPercent ?? null;
  const readiness = model?.readiness ?? {
    status: "unknown" as const,
    headline: "Loading readiness…",
    sleepScore: null,
    readinessScore: null,
    priorDaySteps: null,
    priorDayCaloriesBurned: null,
    sourceLabel: null,
    confidence: "low" as const,
  };

  return (
    <View style={styles.wrap} accessibilityLabel="Today command center" testID="today-command-section">
      <TodaySemiCircleProgress
        completionPercent={completion}
        dateLine={dateLine ?? null}
        loading={loading}
      />
      <TodayReadinessSummary readiness={readiness} loading={loading} />
      <TodayProgressCard model={model} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 0,
    paddingBottom: 4,
    gap: 12,
  },
  emptyCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_PRIMARY,
    opacity: 0.72,
    paddingHorizontal: 4,
  },
});
