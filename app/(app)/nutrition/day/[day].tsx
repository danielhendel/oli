import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useEvents } from "@/lib/data/useEvents";
import { buildNutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { NutritionTodayCard } from "@/lib/ui/nutrition/NutritionTodayCard";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import type { NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import type { CanonicalEventListItem } from "@oli/contracts";

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NutritionDayDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const dayKey = typeof params.day === "string" ? params.day : "";
  const valid = isValidDayKey(dayKey);

  const { user, initializing } = useAuth();
  const facts = useDailyFacts(dayKey);
  const events = useEvents(
    {
      start: dayKey,
      end: dayKey,
      kinds: ["nutrition"],
      limit: 50,
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
      void events.refetch();
    }, [valid, initializing, user?.uid, facts.refetch, events.refetch]),
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

  const nutritionEvents: CanonicalEventListItem[] = useMemo(() => {
    if (events.status !== "ready") return [];
    return events.data.items.filter((e) => e.kind === "nutrition");
  }, [events]);

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

  if (facts.status === "error" || events.status === "error") {
    const msg = facts.status === "error" ? facts.error : events.status === "error" ? events.error : "";
    const rid =
      facts.status === "error" ? facts.requestId : events.status === "error" ? events.requestId : null;
    return (
      <ScreenContainer>
        <ErrorState message={msg} requestId={rid} onRetry={() => {
          void facts.refetch();
          void events.refetch();
        }} />
      </ScreenContainer>
    );
  }

  if (facts.status === "partial" || events.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading day…" />
      </ScreenContainer>
    );
  }

  const hasRollup =
    facts.status === "ready" &&
    facts.data.nutrition != null &&
    (typeof facts.data.nutrition.totalKcal === "number" ||
      typeof facts.data.nutrition.proteinG === "number" ||
      typeof facts.data.nutrition.carbsG === "number" ||
      typeof facts.data.nutrition.fatG === "number");

  const showEmpty = !hasRollup && nutritionEvents.length === 0;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.dayTitle}>{dayKey}</Text>
        {showEmpty ? (
          <EmptyState
            title="No nutrition for this day"
            description="Log nutrition or check back after your data syncs."
          />
        ) : (
          <>
            <NutritionTodayCard
              model={todayModel}
              todayFacts={todayFactsUi}
              onRetryFacts={() => void facts.refetch()}
              onViewMore={() => router.push("/(app)/nutrition/analytics-detail")}
            />
            {nutritionEvents.length > 0 ? (
              <View style={styles.eventsCard}>
                <Text style={styles.eventsTitle}>Logged events</Text>
                {nutritionEvents.map((e) => (
                  <View key={e.id} style={styles.eventRow}>
                    <Text style={styles.eventMeta}>{formatTimeShort(e.start)}</Text>
                    <Text style={styles.eventId} numberOfLines={1}>
                      {e.id}
                    </Text>
                  </View>
                ))}
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
    color: "#1C1C1E",
  },
  eventsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  eventsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  eventRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
    gap: 4,
  },
  eventMeta: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3C3C43",
  },
  eventId: {
    fontSize: 12,
    color: "#8E8E93",
  },
});
