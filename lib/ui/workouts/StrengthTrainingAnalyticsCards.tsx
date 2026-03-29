import React from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { StrengthAnalyticsCardModels } from "@/lib/data/workouts/strengthAnalyticsCardModels";
import { WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";
import { monthShortLabelFromMonthKey } from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import type { StrengthAnalyticsSectionTarget } from "@/lib/workouts/navigation/strengthAnalyticsNavigationIntent";
import { WorkoutAnalyticsChart } from "@/lib/ui/workouts/WorkoutAnalyticsChart";
import { WeeklyMuscleGroupCard } from "@/lib/ui/workouts/WeeklyMuscleGroupCard";
import { WeeklyStrengthCard } from "@/lib/ui/workouts/WeeklyStrengthCard";

export type StrengthTrainingAnalyticsCardsProps = {
  models: StrengthAnalyticsCardModels;
  /** Pass through when charts should show "View More" (e.g. embedded on overview). */
  chartOnViewMore?: () => void;
  /** Brief outline after navigation from Weekly Insights. */
  emphasizedSection?: StrengthAnalyticsSectionTarget | null;
  /** Y offset within this stack (for ScrollView scrollTo). */
  onAnalyticsSectionLayout?: (section: StrengthAnalyticsSectionTarget, y: number) => void;
  /** Initial muscle card tab when opening from a volume/sets-specific insight (future). */
  muscleGroupInitialTab?: "volume" | "sets";
};

const SECTION_TEST_ID: Record<StrengthAnalyticsSectionTarget, string> = {
  weekly_strength: "strength-analytics-weekly-strength",
  weekly_muscle_group: "strength-analytics-weekly-muscle",
  monthly_workouts: "strength-analytics-monthly",
  yearly_workouts: "strength-analytics-yearly",
};

function AnalyticsSectionFrame({
  section,
  emphasized,
  onLayoutY,
  children,
}: {
  section: StrengthAnalyticsSectionTarget;
  emphasized: boolean;
  onLayoutY?: (section: StrengthAnalyticsSectionTarget, y: number) => void;
  children: React.ReactNode;
}) {
  const onLayout = (e: LayoutChangeEvent) => {
    onLayoutY?.(section, e.nativeEvent.layout.y);
  };
  return (
    <View
      testID={SECTION_TEST_ID[section]}
      style={[styles.sectionFrame, emphasized && styles.sectionFrameEmphasized]}
      onLayout={onLayout}
    >
      {children}
    </View>
  );
}

/**
 * Strength-only analytics stack: weekly volume, weekly muscle, monthly + yearly workout charts.
 */
export function StrengthTrainingAnalyticsCards({
  models,
  chartOnViewMore,
  emphasizedSection = null,
  onAnalyticsSectionLayout,
  muscleGroupInitialTab,
}: StrengthTrainingAnalyticsCardsProps) {
  return (
    <View style={styles.stack}>
      <AnalyticsSectionFrame
        section="weekly_strength"
        emphasized={emphasizedSection === "weekly_strength"}
        {...(onAnalyticsSectionLayout != null ? { onLayoutY: onAnalyticsSectionLayout } : {})}
      >
        <WeeklyStrengthCard model={models.weeklyStrengthModel} />
      </AnalyticsSectionFrame>
      <AnalyticsSectionFrame
        section="weekly_muscle_group"
        emphasized={emphasizedSection === "weekly_muscle_group"}
        {...(onAnalyticsSectionLayout != null ? { onLayoutY: onAnalyticsSectionLayout } : {})}
      >
        <WeeklyMuscleGroupCard
          model={models.weeklyStrengthModel}
          {...(muscleGroupInitialTab != null ? { initialTab: muscleGroupInitialTab } : {})}
        />
      </AnalyticsSectionFrame>
      <AnalyticsSectionFrame
        section="monthly_workouts"
        emphasized={emphasizedSection === "monthly_workouts"}
        {...(onAnalyticsSectionLayout != null ? { onLayoutY: onAnalyticsSectionLayout } : {})}
      >
        <WorkoutAnalyticsChart
          layout="singleStrengthPeriod"
          fixedPeriod="month"
          headerTitle="Monthly Workouts"
          yearTabLabel={String(WORKOUT_OVERVIEW_ANALYTICS_YEAR)}
          monthTabLabel={monthShortLabelFromMonthKey(models.focusStrengthMonthKey)}
          {...(chartOnViewMore != null ? { onViewMore: chartOnViewMore } : {})}
          yearChartPoints={models.yearChartPoints}
          yearMetrics={models.yearMetrics}
          monthChartBars={models.strengthMonthOverview.chartBars}
          monthMetrics={models.strengthMonthOverview.metrics}
        />
      </AnalyticsSectionFrame>
      <AnalyticsSectionFrame
        section="yearly_workouts"
        emphasized={emphasizedSection === "yearly_workouts"}
        {...(onAnalyticsSectionLayout != null ? { onLayoutY: onAnalyticsSectionLayout } : {})}
      >
        <WorkoutAnalyticsChart
          layout="singleStrengthPeriod"
          fixedPeriod="year"
          headerTitle="Yearly Workouts"
          yearTabLabel={String(WORKOUT_OVERVIEW_ANALYTICS_YEAR)}
          monthTabLabel={monthShortLabelFromMonthKey(models.focusStrengthMonthKey)}
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
