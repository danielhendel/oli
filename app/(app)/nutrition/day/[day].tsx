import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { buildNutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import {
  buildNutritionDayMealEntries,
  type NutritionDayMealEntry,
} from "@/lib/data/nutrition/nutritionDayMealEntries";
import { resolveNutritionDisplayNutrition } from "@/lib/data/nutrition/nutritionDisplayNutrition";
import { refreshNutritionDayAfterMutation } from "@/lib/data/nutrition/nutritionMutationRefresh";
import { hasNutritionRollupFacts } from "@/lib/data/nutrition/nutritionRollupPresence";
import { rollupNutritionTotalsFromRawEvents } from "@/lib/data/nutrition/nutritionRawDayRollup";
import { useNutritionLogMutations } from "@/lib/hooks/useNutritionLogMutations";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { NutritionTodayCard } from "@/lib/ui/nutrition/NutritionTodayCard";
import { NutritionLogEditSheet } from "@/lib/ui/nutrition/NutritionLogEditSheet";
import { nutritionDayLabel } from "@/lib/ui/nutrition/nutritionDayLabel";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import type { NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import type { MealSlot } from "@/lib/nutrition/mealSlot";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_ELEVATED_BORDER,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export default function NutritionViewFoodScreen() {
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
  const mutations = useNutritionLogMutations();

  const [editing, setEditing] = useState<NutritionDayMealEntry | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "View Food",
    });
  }, [navigation]);

  const refresh = useCallback(() => {
    if (user?.uid) {
      refreshNutritionDayAfterMutation({
        userUid: user.uid,
        dayKey,
        refetchFacts: facts.refetch,
        refetchRaw: rawNutritionDay.refetch,
      });
      return;
    }
    void facts.refetch();
    void rawNutritionDay.refetch();
  }, [user?.uid, dayKey, facts.refetch, rawNutritionDay.refetch]);

  useFocusEffect(
    useCallback(() => {
      if (!valid || initializing || !user?.uid) return;
      refresh();
    }, [valid, initializing, user?.uid, refresh]),
  );

  const rawRollup = useMemo(() => {
    if (rawNutritionDay.status !== "ready") return null;
    return rollupNutritionTotalsFromRawEvents(rawNutritionDay.data.items);
  }, [rawNutritionDay]);

  const displayNutrition = useMemo(() => {
    const factsNutrition = facts.status === "ready" ? facts.data.nutrition : undefined;
    return resolveNutritionDisplayNutrition({
      factsNutrition,
      rawRollup,
      rawEventsReady: rawNutritionDay.status === "ready",
    });
  }, [facts, rawRollup, rawNutritionDay.status]);

  const todayModel = useMemo(
    () => buildNutritionTodayCardModel({ nutrition: displayNutrition.nutrition }),
    [displayNutrition.nutrition],
  );

  const todayFactsUi = useMemo((): NutritionTodayFactsUi => {
    if (facts.status === "missing") return { readiness: "missing", isLoading: false };
    if (facts.status === "ready") return { readiness: "ready", isLoading: false };
    return { readiness: "partial", isLoading: false };
  }, [facts.status]);

  const mealEntries = useMemo(() => {
    if (rawNutritionDay.status !== "ready") return [];
    return buildNutritionDayMealEntries(rawNutritionDay.data.items, 100);
  }, [rawNutritionDay]);

  const hasRollup = useMemo(
    () => hasNutritionRollupFacts(displayNutrition.nutrition),
    [displayNutrition.nutrition],
  );

  const rawFailed = rawNutritionDay.status === "error";
  const factsFailed = facts.status === "error";

  const goLogFood = useCallback(() => {
    router.push({ pathname: "/(app)/nutrition/log-hub", params: { day: dayKey } });
  }, [router, dayKey]);

  const closeSheet = useCallback(() => {
    mutations.reset();
    setEditing(null);
  }, [mutations]);

  const onSaveEdit = useCallback(
    async (args: { observedAtIso: string; mealSlot: MealSlot }) => {
      if (editing == null) return;
      const res = await mutations.updateLog({
        rawEventId: editing.id,
        payload: editing.payload,
        observedAtIso: args.observedAtIso,
        mealSlot: args.mealSlot,
      });
      if (res.ok) {
        setEditing(null);
        refresh();
      }
    },
    [editing, mutations, refresh],
  );

  const onDeleteEdit = useCallback(() => {
    if (editing == null) return;
    const target = editing;
    Alert.alert("Delete meal?", `Remove "${target.title}" from this day?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const res = await mutations.deleteLog(target.id);
            if (res.ok) {
              setEditing(null);
              refresh();
            }
          })();
        },
      },
    ]);
  }, [editing, mutations, refresh]);

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

  const logFoodButton = (
    <Pressable
      onPress={goLogFood}
      style={({ pressed }) => [styles.logBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Log food for this day"
      testID="view-food-log-cta"
    >
      <Text style={styles.logBtnText}>＋ Log Food</Text>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <Text style={styles.title}>View Food</Text>
          <Text style={styles.dayLabel} testID="view-food-day">
            {nutritionDayLabel(dayKey)}
          </Text>
        </View>

        {hasRollup ? (
          <NutritionTodayCard
            headingTitle="Summary"
            model={todayModel}
            todayFacts={todayFactsUi}
            totalsSyncing={displayNutrition.totalsSyncing}
            onRetryFacts={() => void facts.refetch()}
          />
        ) : null}

        {logFoodButton}

        {mutations.errorMessage != null ? (
          <View style={styles.syncBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.syncBody}>{mutations.errorMessage}</Text>
          </View>
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

        {!rawFailed && mealEntries.length > 0 ? (
          <View style={styles.eventsCard}>
            <Text style={styles.eventsTitle}>Logged meals</Text>
            {mealEntries.map((entry, index) => {
              const editable = entry.editable;
              return (
                <Pressable
                  key={entry.id}
                  onPress={editable ? () => setEditing(entry) : undefined}
                  disabled={!editable}
                  accessibilityRole={editable ? "button" : "text"}
                  accessibilityLabel={
                    editable
                      ? `Edit ${entry.title}, ${entry.subtitle}, ${entry.kcalLabel}`
                      : `${entry.title}, ${entry.subtitle}, ${entry.kcalLabel}`
                  }
                  style={({ pressed }) => [
                    styles.eventRow,
                    index === 0 && styles.eventRowFirst,
                    pressed && editable && styles.eventRowPressed,
                  ]}
                  testID={`view-food-meal-${entry.id}`}
                >
                  <View style={styles.eventRowMain}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {entry.title}
                    </Text>
                    <Text style={styles.eventSubtitle} numberOfLines={2}>
                      {entry.subtitle}
                    </Text>
                  </View>
                  <View style={styles.eventRight}>
                    <Text style={styles.eventKcal} numberOfLines={1}>
                      {entry.kcalLabel}
                    </Text>
                    {editable ? (
                      <Text
                        style={styles.eventEdit}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        Edit
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!rawFailed && mealEntries.length === 0 ? (
          <EmptyState
            title="No meals logged"
            description="Tap Log Food to add your first meal for this day."
          />
        ) : null}
      </ScrollView>

      <NutritionLogEditSheet
        visible={editing != null}
        entry={editing}
        dayKey={dayKey}
        status={mutations.status}
        errorMessage={mutations.errorMessage}
        onClose={closeSheet}
        onSave={(args) => void onSaveEdit(args)}
        onDelete={onDeleteEdit}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
    flexGrow: 1,
  },
  title: { fontSize: 28, fontWeight: "800", color: UI_TEXT_PRIMARY, letterSpacing: -0.4 },
  dayLabel: { fontSize: 15, fontWeight: "500", color: UI_TEXT_SECONDARY, marginTop: 2 },
  logBtn: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  eventsCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 4,
  },
  eventsTitle: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY, marginBottom: 4 },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  eventRowFirst: { borderTopWidth: 0, paddingTop: 4 },
  eventRowPressed: { opacity: 0.6 },
  eventRowMain: { flex: 1, minWidth: 0, gap: 4 },
  eventTitle: { fontSize: 17, fontWeight: "600", color: UI_TEXT_PRIMARY, letterSpacing: -0.28 },
  eventSubtitle: { fontSize: 13, fontWeight: "400", color: UI_TEXT_TERTIARY_LABEL, letterSpacing: -0.08 },
  eventRight: { alignItems: "flex-end", gap: 4 },
  eventKcal: { fontSize: 15, fontWeight: "600", color: UI_TEXT_PRIMARY, fontVariant: ["tabular-nums"] },
  eventEdit: { fontSize: 13, fontWeight: "600", color: SYSTEM_ACCENT },
  syncBanner: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
  },
  syncTitle: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY },
  syncBody: { fontSize: 15, color: UI_TEXT_SECONDARY, lineHeight: 22 },
  syncRetry: { fontSize: 16, fontWeight: "600", color: SYSTEM_ACCENT, marginTop: 4 },
});
