import React from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { StrengthAnalyticsCardModels } from "@/lib/data/workouts/strengthAnalyticsCardModels";
import { WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";
import { monthShortLabelFromMonthKey } from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import type { StrengthAnalyticsSectionTarget } from "@/lib/workouts/navigation/strengthAnalyticsNavigationIntent";
import { WorkoutAnalyticsChart } from "@/lib/ui/workouts/WorkoutAnalyticsChart";

export type StrengthTrainingAnalyticsCardsProps = {
  models: StrengthAnalyticsCardModels;
  /** Pass through when charts should show "View More" (e.g. embedded on overview). */
  chartOnViewMore?: () => void;
  /** Brief outline after navigation from Weekly Insights. */
  emphasizedSection?: StrengthAnalyticsSectionTarget | null;
  /** Y offset within this stack (for ScrollView scrollTo). */
  onAnalyticsSectionLayout?: (section: StrengthAnalyticsSectionTarget, y: number) => void;
};

const YEARLY_SECTION_TEST_ID = "strength-analytics-yearly";

function AnalyticsSectionFrame({
  emphasized,
  onLayoutY,
  children,
}: {
  emphasized: boolean;
  onLayoutY?: (section: StrengthAnalyticsSectionTarget, y: number) => void;
  children: React.ReactNode;
}) {
  const onLayout = (e: LayoutChangeEvent) => {
    onLayoutY?.("yearly_workouts", e.nativeEvent.layout.y);
  };
  return (
    <View testID={YEARLY_SECTION_TEST_ID} style={[styles.sectionFrame, emphasized && styles.sectionFrameEmphasized]} onLayout={onLayout}>
      {children}
    </View>
  );
}

/**
 * Strength analytics: yearly workout chart + metrics ({@link WORKOUT_OVERVIEW_ANALYTICS_YEAR} slice).
 */
export function StrengthTrainingAnalyticsCards({
  models,
  chartOnViewMore,
  emphasizedSection = null,
  onAnalyticsSectionLayout,
}: StrengthTrainingAnalyticsCardsProps) {
  const yearlyTitle = `${WORKOUT_OVERVIEW_ANALYTICS_YEAR} Strength Workouts`;

  return (
    <View style={styles.stack}>
      <AnalyticsSectionFrame
        emphasized={emphasizedSection === "yearly_workouts"}
        {...(onAnalyticsSectionLayout != null ? { onLayoutY: onAnalyticsSectionLayout } : {})}
      >
        <WorkoutAnalyticsChart
          layout="singleStrengthPeriod"
          layoutVariant="strengthYearly"
          fixedPeriod="year"
          headerTitle={yearlyTitle}
          yearTabLabel={String(WORKOUT_OVERVIEW_ANALYTICS_YEAR)}
          monthTabLabel={monthShortLabelFromMonthKey(models.focusStrengthMonthKey)}
          yearlyStrengthVisualization={{
            avgWorkoutsPerWeek: models.strengthBaselineAvgWorkoutsPerWeek,
            analyticsCalendarYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
            todayMonthKey: models.focusStrengthMonthKey,
          }}
          {...(chartOnViewMore != null ? { onViewMore: chartOnViewMore } : {})}
          yearChartPoints={models.yearChartPoints}
          yearMetrics={models.yearMetrics}
          monthChartBars={models.strengthMonthOverview.chartBars}
          monthMetrics={models.strengthMonthOverview.metrics}
        />
      </AnalyticsSectionFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20,
  },
  sectionFrame: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sectionFrameEmphasized: {
    borderColor: "rgba(0, 122, 255, 0.35)",
    backgroundColor: "rgba(0, 122, 255, 0.05)",
  },
});
