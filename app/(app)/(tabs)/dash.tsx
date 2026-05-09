// app/(app)/(tabs)/dash.tsx
<<<<<<< HEAD
// Oli — Dash: tab header + Today hero + Body Composition + Daily Energy + Weekly Fitness.
import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { TodayHealthHero } from "@/components/dashboard/TodayHealthHero";
=======
// Oli — Dash: tab header + Daily Energy hero card.
import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
>>>>>>> origin/main
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import {
  UI_APP_SCREEN_BG,
<<<<<<< HEAD
  UI_TAB_ROOT_INSET,
} from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBodyCompositionDashCard } from "@/lib/data/dash/useBodyCompositionDashCard";
import { useDailyNutritionCard } from "@/lib/data/dash/useDailyNutritionCard";
import { useWeeklyFitnessCard } from "@/lib/data/dash/useWeeklyFitnessCard";
import { useTodayHealthHero } from "@/lib/hooks/useTodayHealthHero";
import { BodyCompositionCard } from "@/lib/ui/dash/BodyCompositionCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { DailyNutritionCard } from "@/lib/ui/dash/DailyNutritionCard";
import { WeeklyFitnessCard } from "@/lib/ui/dash/WeeklyFitnessCard";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export default function DashScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { user } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const { vm: todayHero, energy, energyLoading, energyError, refetch } = useTodayHealthHero(todayKey);
  const weeklyFitness = useWeeklyFitnessCard();
  const bodyComposition = useBodyCompositionDashCard();
  const dailyNutrition = useDailyNutritionCard(todayKey);
=======
  UI_TAB_ROOT_CONTENT_GUTTER,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SLATE_COOL,
} from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

const DASH_SECTION_TAGLINE = "Track, understand, and improve every part of your health.";

export default function DashScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { energy, loading, error, refetch } = useDailyEnergyCard(getTodayDayKeyLocal());
>>>>>>> origin/main

  useFocusEffect(
    React.useCallback(() => {
      refetch({ cacheBust: "dashEnergyFocus" });
    }, [refetch]),
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Oli" rightSlot={<SettingsGearButton />} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stacksSection}>
<<<<<<< HEAD
            <TodayHealthHero vm={todayHero} />
            <WeeklyFitnessCard
              loading={weeklyFitness.loading}
              error={weeklyFitness.error}
              rows={weeklyFitness.rows}
              combined={weeklyFitness.combined}
              progressToGoalVm={weeklyFitness.progressToGoalVm}
              goalsHref={weeklyFitness.goalsHref}
              hasUser={user != null}
            />
            <BodyCompositionCard
              loading={bodyComposition.loading}
              error={bodyComposition.error}
              hasUser={bodyComposition.hasUser}
              goalsHref={bodyComposition.goalsHref}
              built={bodyComposition.built}
            />

            <DailyEnergyCard
              energy={energy}
              loading={energyLoading}
              error={energyError}
            />
            <DailyNutritionCard
              model={dailyNutrition.model}
              loading={dailyNutrition.loading}
              error={dailyNutrition.error}
=======
            <View style={styles.stacksHeaderInset}>
              <Text style={styles.sectionHeading} accessibilityRole="header">
                Dash
              </Text>
              <Text style={styles.stacksTagline}>{DASH_SECTION_TAGLINE}</Text>
            </View>

            <DailyEnergyCard
              energy={energy}
              loading={loading}
              error={error}
>>>>>>> origin/main
            />
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scrollView: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 0,
    flexGrow: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  stacksSection: {},
<<<<<<< HEAD
=======
  stacksHeaderInset: {
    paddingHorizontal: UI_TAB_ROOT_CONTENT_GUTTER,
  },
  sectionHeading: {
    marginTop: 18,
    marginBottom: 0,
    fontSize: 26,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  stacksTagline: {
    fontSize: 17,
    fontWeight: "400",
    color: UI_TEXT_SLATE_COOL,
    marginTop: 7,
    marginBottom: 12,
    lineHeight: 26,
    letterSpacing: 0.15,
    flexShrink: 1,
    alignSelf: "stretch",
  },
>>>>>>> origin/main
});
