/**
 * Legacy Dash composition host (post–Phase 1 / Phase 2C rollback).
 * Preserves empty-card behavior and current card order. Not modernized.
 */

import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashScreenHeader } from "@/components/dashboard/DashScreenHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBodyCompositionDashCard } from "@/lib/data/dash/useBodyCompositionDashCard";
import { useDailyNutritionCard } from "@/lib/data/dash/useDailyNutritionCard";
import { isDashWeeklyProgressRelocationEnabled } from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { LEGACY_DASH_SCREEN_TITLE } from "@/lib/data/dash/dashDailyMonitorFoundation";
import { useTodayHealthHero } from "@/lib/hooks/useTodayHealthHero";
import { useDailyReadinessCard } from "@/lib/hooks/useDailyReadinessCard";
import { BodyCompositionCard } from "@/lib/ui/dash/BodyCompositionCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { DailyReadinessCard } from "@/lib/ui/dash/DailyReadinessCard";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";
import { DailyNutritionCard } from "@/lib/ui/dash/DailyNutritionCard";
import { WeeklyFitnessCardHost } from "@/lib/ui/dash/WeeklyFitnessCardHost";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export function LegacyDashHost(): React.ReactElement {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { user } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const showWeeklyFitnessOnDash = !isDashWeeklyProgressRelocationEnabled();
  const {
    energy,
    energyLoading,
    energyError,
    sleepCardVm,
    exactDayRestingHeartRateBpm,
    attributedSleepNight,
    attributedSleepResolution,
    refetch,
  } = useTodayHealthHero(todayKey);
  const readinessCard = useDailyReadinessCard(todayKey, {
    enabled: Boolean(user),
    exactDayRestingHeartRateBpm,
  });
  const bodyComposition = useBodyCompositionDashCard();
  const dailyNutrition = useDailyNutritionCard(todayKey);

  useFocusEffect(
    React.useCallback(() => {
      refetch({ cacheBust: "dashEnergyFocus" });
      readinessCard.refetch({ cacheBust: "dashReadinessFocus" });
    }, [refetch, readinessCard.refetch]),
  );

  return (
    <View style={styles.root}>
      <DashScreenHeader title={LEGACY_DASH_SCREEN_TITLE} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stacksSection}>
          {showWeeklyFitnessOnDash ? <WeeklyFitnessCardHost /> : null}
          <BodyCompositionCard
            loading={bodyComposition.loading}
            error={bodyComposition.error}
            hasUser={bodyComposition.hasUser}
            built={bodyComposition.built}
          />

          <DailyEnergyCard energy={energy} loading={energyLoading} error={energyError} />
          <DailySleepCard
            vm={sleepCardVm}
            attributedSleepNight={attributedSleepNight}
            attributedSleepResolution={attributedSleepResolution}
          />
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
