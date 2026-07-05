// app/(app)/(tabs)/dash.tsx
// Oli — Dash: tab header + Today hero + Today Command Center + module cards.
import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { TodayHealthHero } from "@/components/dashboard/TodayHealthHero";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBodyCompositionDashCard } from "@/lib/data/dash/useBodyCompositionDashCard";
import { useDailyNutritionCard } from "@/lib/data/dash/useDailyNutritionCard";
import { useWeeklyFitnessCard } from "@/lib/data/dash/useWeeklyFitnessCard";
import { useTodayHealthHero } from "@/lib/hooks/useTodayHealthHero";
import { useTodayCommand } from "@/lib/hooks/useTodayCommand";
import { useDailyReadinessCard } from "@/lib/hooks/useDailyReadinessCard";
import { BodyCompositionCard } from "@/lib/ui/dash/BodyCompositionCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { DailyReadinessCard } from "@/lib/ui/dash/DailyReadinessCard";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";
import { DailyNutritionCard } from "@/lib/ui/dash/DailyNutritionCard";
import { WeeklyFitnessCard } from "@/lib/ui/dash/WeeklyFitnessCard";
import { DashWeeklySection } from "@/lib/ui/dash/DashWeeklySection";
import { TodayCommandSection } from "@/lib/ui/today/TodayCommandSection";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export default function DashScreen() {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { user } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const {
    vm: todayHero,
    energy,
    energyLoading,
    energyError,
    sleepCardVm,
    refetch,
  } = useTodayHealthHero(todayKey);
  const todayCommand = useTodayCommand(todayKey);
  const readinessCard = useDailyReadinessCard(todayKey, { enabled: Boolean(user) });
  const weeklyFitness = useWeeklyFitnessCard();
  const bodyComposition = useBodyCompositionDashCard();
  const dailyNutrition = useDailyNutritionCard(todayKey);

  useFocusEffect(
    React.useCallback(() => {
      refetch({ cacheBust: "dashEnergyFocus" });
      todayCommand.refetch({ cacheBust: "dashTodayCommandFocus" });
      readinessCard.refetch({ cacheBust: "dashReadinessFocus" });
    }, [refetch, todayCommand.refetch, readinessCard.refetch]),
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
            <TodayHealthHero vm={todayHero} />
            <TodayCommandSection
              model={todayCommand.model}
              loading={todayCommand.loading}
              error={todayCommand.error}
            />
            <DashWeeklySection>
              <WeeklyFitnessCard
                loading={weeklyFitness.loading}
                error={weeklyFitness.error}
                rows={weeklyFitness.rows}
                combined={weeklyFitness.combined}
                progressToGoalVm={weeklyFitness.progressToGoalVm}
                goalsHref={weeklyFitness.goalsHref}
                hasUser={user != null}
              />
            </DashWeeklySection>
            <BodyCompositionCard
              loading={bodyComposition.loading}
              error={bodyComposition.error}
              hasUser={bodyComposition.hasUser}
              goalsHref={bodyComposition.goalsHref}
              built={bodyComposition.built}
            />

            <DailyEnergyCard energy={energy} loading={energyLoading} error={energyError} />
            <DailyReadinessCard vm={readinessCard.vm} />
            <DailySleepCard vm={sleepCardVm} />
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
