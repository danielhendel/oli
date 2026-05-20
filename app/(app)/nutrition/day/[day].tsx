import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { buildNutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import { buildNutritionRecentMealRowsFromRaw } from "@/lib/data/nutrition/nutritionRecentCardModel";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { NutritionTodayCard } from "@/lib/ui/nutrition/NutritionTodayCard";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import type { NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_ELEVATED_BORDER,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
export default function NutritionDayDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const dayKey = typeof params.day === "string" ? params.day : "";
  const valid = isValidDayKey(dayKey);

  const { user, initializing } = useAuth();
  const facts = useDailyFacts(dayKey);
  const rawNutritionDay = useRawEvents(
    {
      start: dayKey,
      end: dayKey,
      kinds: ["nutrition"],
      includePayload: true,
      limit: 100,
    },
    { enabled: valid && !initializing && !!user },
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Nutrition day",
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!valid || initializing || !user?.uid) return;
      void facts.refetch();
      void rawNutritionDay.refetch();
    }, [valid, initializing, user?.uid, facts.refetch, rawNutritionDay.refetch]),
  );

  const todayModel = useMemo(() => {
    if (facts.status !== "ready") return buildNutritionTodayCardModel({ nutrition: undefined });
    return buildNutritionTodayCardModel({ nutrition: facts.data.nutrition });
  }, [facts]);

  const todayFactsUi = useMemo((): NutritionTodayFactsUi => {
    if (facts.status === "missing") return { readiness: "missing", isLoading: false };
    if (facts.status === "ready") return { readiness: "ready", isLoading: false };
    return { readiness: "partial", isLoading: false };
  }, [facts.status]);

  const mealRows = useMemo(() => {
    if (rawNutritionDay.status !== "ready") return [];
    return buildNutritionRecentMealRowsFromRaw(rawNutritionDay.data.items, 100);
  }, [rawNutritionDay]);

  const hasRollup = useMemo(() => {
    if (facts.status !== "ready") return false;
    const n = facts.data.nutrition;
    if (n == null) return false;
    return (
      typeof n.totalKcal === "number" ||
      typeof n.proteinG === "number" ||
      typeof n.carbsG === "number" ||
      typeof n.fatG === "number"
    );
  }, [facts]);

  const rawFailed = rawNutritionDay.status === "error";
  const factsFailed = facts.status === "error";

  if (!valid) {
    return (
      <ScreenContainer>
        <EmptyState title="Invalid day" description="Use a calendar day in YYYY-MM-DD format." />
      </ScreenContainer>
    );
  }

  if (initializing) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading…" />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer>
        <EmptyState title="Sign in required" description="Sign in to view this day." />
      </ScreenContainer>
    );
  }

  if (factsFailed) {
    return (
      <ScreenContainer>
        <ErrorState message={facts.error} requestId={facts.requestId} onRetry={() => void facts.refetch()} />
      </ScreenContainer>
    );
  }

  if (facts.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading day…" />
      </ScreenContainer>
    );
  }

  const showGlobalEmpty =
    !hasRollup && mealRows.length === 0 && !rawFailed && facts.status !== "missing";

  const showMissingRollupOnly = facts.status === "missing" && mealRows.length === 0 && !rawFailed;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.dayTitle}>{dayKey}</Text>

        {showGlobalEmpty || showMissingRollupOnly ? (
          <EmptyState
            title="No nutrition for this day"
            description="Log nutrition or check back after your data syncs."
          />
        ) : (
          <>
            {hasRollup ? (
              <NutritionTodayCard
                model={todayModel}
                todayFacts={todayFactsUi}
                onRetryFacts={() => void facts.refetch()}
                onViewMore={() => router.push("/(app)/nutrition/analytics-detail")}
              />
            ) : null}

            {rawFailed ? (
              <View style={styles.syncBanner} accessibilityRole="text">
                <Text style={styles.syncTitle}>Meal list unavailable</Text>
                <Text style={styles.syncBody}>
                  {hasRollup
                    ? "Daily totals above are up to date. We could not load individual meals — try again."
                    : "Could not load nutrition events for this day."}
                </Text>
                <Text
                  style={styles.syncRetry}
                  onPress={() => void rawNutritionDay.refetch()}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading meals"
                >
                  Retry
                </Text>
              </View>
            ) : null}

            {!rawFailed && mealRows.length > 0 ? (
              <View style={styles.eventsCard}>
                <Text style={styles.eventsTitle}>Logged meals</Text>
                {mealRows.map((row, index) => (
                  <View
                    key={row.id}
                    style={[styles.eventRow, index === 0 && styles.eventRowFirst]}
                  >
                    <View style={styles.eventRowMain}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {row.title}
                      </Text>
                      <Text style={styles.eventSubtitle} numberOfLines={2}>
                        {row.subtitle}
                      </Text>
                    </View>
                    {row.kcalLabel != null ? (
                      <Text style={styles.eventKcal} numberOfLines={1}>
                        {row.kcalLabel}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {!rawFailed && hasRollup && mealRows.length === 0 ? (
              <View style={styles.syncBanner} accessibilityRole="text">
                <Text style={styles.syncBody}>
                  Totals are updated; individual meal rows appear here once processing completes.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
    flexGrow: 1,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
  },
  eventsCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 10,
  },
  eventsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  eventRowFirst: {
    borderTopWidth: 0,
    paddingTop: 4,
  },
  eventRowMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
  },
  eventSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.08,
  },
  eventKcal: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  syncBanner: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
  },
  syncTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  syncBody: {
    fontSize: 15,
    color: UI_TEXT_SECONDARY,
    lineHeight: 22,
  },
  syncRetry: {
    fontSize: 16,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
    marginTop: 4,
  },
});
