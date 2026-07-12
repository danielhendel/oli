// app/(app)/(tabs)/dash.tsx
// Oli — Dash: header + retained module cards (Weekly Fitness first).
import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { DashScreenHeader } from "@/components/dashboard/DashScreenHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBodyCompositionDashCard } from "@/lib/data/dash/useBodyCompositionDashCard";
import { useDailyNutritionCard } from "@/lib/data/dash/useDailyNutritionCard";
import { useWeeklyFitnessCard } from "@/lib/data/dash/useWeeklyFitnessCard";
import { useTodayHealthHero } from "@/lib/hooks/useTodayHealthHero";
import { useDailyReadinessCard } from "@/lib/hooks/useDailyReadinessCard";
import { BodyCompositionCard } from "@/lib/ui/dash/BodyCompositionCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { DailyReadinessCard } from "@/lib/ui/dash/DailyReadinessCard";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";
import { DailyNutritionCard } from "@/lib/ui/dash/DailyNutritionCard";
import { WeeklyFitnessCard } from "@/lib/ui/dash/WeeklyFitnessCard";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export default function DashScreen() {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { user } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const {
    energy,
    energyLoading,
    energyError,
    sleepCardVm,
    exactDayRestingHeartRateBpm,
    refetch,
  } = useTodayHealthHero(todayKey);
  const readinessCard = useDailyReadinessCard(todayKey, {
    enabled: Boolean(user),
    exactDayRestingHeartRateBpm,
  });
  const weeklyFitness = useWeeklyFitnessCard();
  const bodyComposition = useBodyCompositionDashCard();
  const dailyNutrition = useDailyNutritionCard(todayKey);

  useFocusEffect(
    React.useCallback(() => {
      refetch({ cacheBust: "dashEnergyFocus" });
      readinessCard.refetch({ cacheBust: "dashReadinessFocus" });
    }, [refetch, readinessCard.refetch]),
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <DashScreenHeader />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stacksSection}>
            <WeeklyFitnessCard
              loading={weeklyFitness.loading}
              error={weeklyFitness.error}
              model={weeklyFitness.model}
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

            <DailyEnergyCard energy={energy} loading={energyLoading} error={energyError} />
            <DailySleepCard vm={sleepCardVm} />
            <DailyReadinessCard vm={readinessCard.vm} />
            <DailyNutritionCard
              model={dailyNutrition.model}
              loading={dailyNutrition.loading}
              error={dailyNutrition.error}
              onPress={() => router.push("/(app)/nutrition")}
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
});
