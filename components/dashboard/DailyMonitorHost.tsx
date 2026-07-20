/**
 * Daily Monitor host — presence-driven current-day cards only (Phase 2C).
 */

import React, { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashScreenHeader } from "@/components/dashboard/DashScreenHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  DAILY_MONITOR_SCREEN_TITLE,
} from "@/lib/data/dash/dashDailyMonitorFoundation";
import { buildDailyMonitorViewModel } from "@/lib/data/dash/buildDailyMonitorViewModel";
import { useBodyCompositionDashCard } from "@/lib/data/dash/useBodyCompositionDashCard";
import { useDailyNutritionCard } from "@/lib/data/dash/useDailyNutritionCard";
import {
  resolveBodyCompositionMonitorPresence,
  resolveEnergyMonitorPresence,
  resolveNutritionMonitorPresence,
  resolveReadinessMonitorPresence,
  resolveSleepMonitorPresence,
} from "@/lib/data/dash/resolveDailyMonitorDomainPresence";
import { presenceCreatesMainStackCard } from "@/lib/data/dash/dailyMonitorPresence";
import { useCurrentLocalDayKey } from "@/lib/hooks/useCurrentLocalDayKey";
import { useDailyReadinessCard } from "@/lib/hooks/useDailyReadinessCard";
import { useTodayHealthHero } from "@/lib/hooks/useTodayHealthHero";
import { formatDayKeyStackNavTitle } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { BodyCompositionCard } from "@/lib/ui/dash/BodyCompositionCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { DailyNutritionCard } from "@/lib/ui/dash/DailyNutritionCard";
import { DailyReadinessCard } from "@/lib/ui/dash/DailyReadinessCard";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { EmptyState, ErrorState } from "@/lib/ui/ScreenStates";
import {
  UI_APP_SCREEN_BG,
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export function DailyMonitorHost(): React.ReactElement {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { user } = useAuth();
  const { dayKey } = useCurrentLocalDayKey();
  const dateLabel = useMemo(() => formatDayKeyStackNavTitle(dayKey), [dayKey]);

  const {
    energy,
    energyLoading,
    energyError,
    sleepCardVm,
    exactDayRestingHeartRateBpm,
    refetch,
  } = useTodayHealthHero(dayKey);
  const readinessCard = useDailyReadinessCard(dayKey, {
    enabled: Boolean(user),
    exactDayRestingHeartRateBpm,
  });
  const bodyComposition = useBodyCompositionDashCard();
  const dailyNutrition = useDailyNutritionCard(dayKey);

  const sleepPresence = resolveSleepMonitorPresence(sleepCardVm);
  const readinessPresence = resolveReadinessMonitorPresence(readinessCard.vm);
  const energyPresence = resolveEnergyMonitorPresence({
    energy,
    loading: energyLoading,
    error: energyError,
    requestedDay: dayKey,
  });
  const nutritionPresence = resolveNutritionMonitorPresence({
    model: dailyNutrition.model,
    loading: dailyNutrition.loading,
    error: dailyNutrition.error,
  });
  const bodyPresence = resolveBodyCompositionMonitorPresence({
    requestedDay: dayKey,
    overviewDay: bodyComposition.overviewDay,
    seriesLoading: bodyComposition.loading,
    seriesError: bodyComposition.error,
    hasUser: bodyComposition.hasUser,
    built: bodyComposition.built,
  });

  const monitorVm = useMemo(
    () =>
      buildDailyMonitorViewModel({
        requestedDay: dayKey,
        dateLabel,
        signedOut: !user,
        domains: [
          { domainId: "sleep", presence: sleepPresence },
          { domainId: "readiness", presence: readinessPresence },
          { domainId: "energy", presence: energyPresence },
          { domainId: "nutrition", presence: nutritionPresence },
          { domainId: "body_composition", presence: bodyPresence },
        ],
      }),
    [
      dayKey,
      dateLabel,
      user,
      sleepPresence,
      readinessPresence,
      energyPresence,
      nutritionPresence,
      bodyPresence,
    ],
  );

  const onRetry = useCallback(() => {
    refetch({ cacheBust: `dailyMonitorRetry:${Date.now()}` });
    readinessCard.refetch({ cacheBust: `dailyMonitorRetry:${Date.now()}` });
  }, [refetch, readinessCard.refetch]);

  useFocusEffect(
    React.useCallback(() => {
      refetch({ cacheBust: "dailyMonitorFocus" });
      readinessCard.refetch({ cacheBust: "dailyMonitorFocus" });
    }, [refetch, readinessCard.refetch]),
  );

  const showSleep = presenceCreatesMainStackCard(sleepPresence);
  const showReadiness = presenceCreatesMainStackCard(readinessPresence);
  const showEnergy = presenceCreatesMainStackCard(energyPresence);
  const showNutrition = presenceCreatesMainStackCard(nutritionPresence);
  const showBody = presenceCreatesMainStackCard(bodyPresence);

  return (
    <View style={styles.root} testID="daily-monitor-host">
      <DashScreenHeader
        title={DAILY_MONITOR_SCREEN_TITLE}
        dateLabel={dateLabel}
        accessibilityLabel={`${DAILY_MONITOR_SCREEN_TITLE}. ${dateLabel}`}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {monitorVm.showPartialRefreshBanner ? (
          <View
            style={styles.banner}
            accessibilityRole="text"
            accessibilityLabel="Some data couldn't be refreshed."
          >
            <Text style={styles.bannerText}>Some data couldn{"\u2019"}t be refreshed.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry refresh"
              onPress={onRetry}
              style={styles.bannerRetry}
              hitSlop={8}
            >
              <Text style={styles.bannerRetryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {monitorVm.screenStatus === "loading" ? (
          <Text style={styles.status} accessibilityRole="text">
            Loading Daily Monitor{"\u2026"}
          </Text>
        ) : null}

        {monitorVm.screenStatus === "error" ? (
          <ErrorState
            variant="inline"
            title="Couldn't load today's data"
            message={monitorVm.errorMessage ?? "Please try again."}
            onRetry={onRetry}
          />
        ) : null}

        {monitorVm.screenStatus === "empty" ? (
          <EmptyState
            title={monitorVm.emptyTitle ?? "No health data is available for today yet."}
            description={
              monitorVm.emptySubtitle ??
              "Data will appear as devices sync or you add entries."
            }
          />
        ) : null}

        {monitorVm.sections.map((section) => (
          <View key={section.id} style={styles.section} accessibilityRole="header">
            <Text
              style={styles.sectionTitle}
              accessibilityRole="header"
              accessibilityLabel={section.title}
            >
              {section.title}
            </Text>
            {section.domainIds.includes("sleep") && showSleep ? (
              <DailySleepCard
                vm={sleepCardVm}
                title="Sleep"
                scoreCaption="Oura Sleep Score"
                cardAccessibilityLabel="Sleep card"
              />
            ) : null}
            {section.domainIds.includes("readiness") && showReadiness ? (
              <DailyReadinessCard vm={readinessCard.vm} title="Readiness" />
            ) : null}
            {section.domainIds.includes("energy") && showEnergy ? (
              <DailyEnergyCard
                energy={energy}
                loading={false}
                error={
                  energyPresence === "refresh_error_with_cached_day_evidence"
                    ? energyError
                    : null
                }
                title="Energy Expenditure"
              />
            ) : null}
            {section.domainIds.includes("nutrition") && showNutrition ? (
              <DailyNutritionCard
                model={dailyNutrition.model}
                loading={false}
                error={null}
                title="Nutrition"
                onPress={() => router.push("/(app)/nutrition")}
              />
            ) : null}
            {section.domainIds.includes("body_composition") && showBody ? (
              <BodyCompositionCard
                loading={false}
                error={null}
                hasUser={bodyComposition.hasUser}
                goalsHref={bodyComposition.goalsHref}
                built={bodyComposition.built}
                /** Same-day reading — omit prior-day “As of …” carry-forward copy. */
                suppressAsOfLabel
              />
            ) : null}
          </View>
        ))}
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
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: 0.2,
    marginTop: 12,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  status: {
    marginTop: 24,
    textAlign: "center",
    color: UI_TEXT_MUTED,
    fontSize: 15,
  },
  banner: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  bannerText: {
    flex: 1,
    color: UI_TEXT_PRIMARY,
    fontSize: 14,
  },
  bannerRetry: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  bannerRetryText: {
    color: UI_TEXT_PRIMARY,
    fontWeight: "600",
    fontSize: 14,
  },
});
