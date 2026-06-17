import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useRawEvents } from "@/lib/data/useRawEvents";
import {
  buildNutritionMacroDetailModel,
  isNutritionMacroKey,
} from "@/lib/data/nutrition/nutritionMacroDetailModel";
import { resolveNutritionDisplayNutrition } from "@/lib/data/nutrition/nutritionDisplayNutrition";
import { rollupNutritionTotalsFromRawEvents } from "@/lib/data/nutrition/nutritionRawDayRollup";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { nutritionDayLabel } from "@/lib/ui/nutrition/nutritionDayLabel";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import {
  NUTRITION_ACCENT,
  NUTRITION_PROGRESS_TRACK_BG,
  NUTRITION_SCREEN_CONTENT_BG,
} from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export default function NutritionMacroDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ macro?: string; day?: string }>();
  const macroParam = typeof params.macro === "string" ? params.macro : "";
  const macroValid = isNutritionMacroKey(macroParam);
  const dayKey = resolveNutritionDayParam(params.day);
  const dayValid = isValidDayKey(dayKey);

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
    { enabled: macroValid && dayValid && !initializing && !!user },
  );

  const title = macroValid
    ? macroParam.charAt(0).toUpperCase() + macroParam.slice(1)
    : "Nutrition";

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title,
    });
  }, [navigation, title]);

  useFocusEffect(
    useCallback(() => {
      if (!macroValid || !dayValid || initializing || !user?.uid) return;
      void facts.refetch();
      void rawNutritionDay.refetch();
    }, [macroValid, dayValid, initializing, user?.uid, facts.refetch, rawNutritionDay.refetch]),
  );

  const model = useMemo(() => {
    if (!macroValid) return null;
    const factsNutrition = facts.status === "ready" ? facts.data.nutrition : undefined;
    const rawItems = rawNutritionDay.status === "ready" ? rawNutritionDay.data.items : [];
    const rawRollup = rawNutritionDay.status === "ready" ? rollupNutritionTotalsFromRawEvents(rawItems) : null;
    const { nutrition } = resolveNutritionDisplayNutrition({
      factsNutrition,
      rawRollup,
      rawEventsReady: rawNutritionDay.status === "ready",
    });
    return buildNutritionMacroDetailModel({ macro: macroParam, nutrition, rawItems });
  }, [macroValid, macroParam, facts, rawNutritionDay]);

  if (!macroValid) {
    return (
      <ScreenContainer>
        <EmptyState title="Unknown macro" description="Choose protein, carbs, or fat." />
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
        <EmptyState title="Sign in required" description="Sign in to view nutrition details." />
      </ScreenContainer>
    );
  }

  if (facts.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState message={facts.error} requestId={facts.requestId} onRetry={() => void facts.refetch()} />
      </ScreenContainer>
    );
  }

  if (facts.status === "partial" || model == null) {
    return (
      <ScreenContainer>
        <LoadingState message={`Loading ${title.toLowerCase()}…`} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.dayLabel} testID="macro-detail-day">
            {nutritionDayLabel(dayKey)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeadRow}>
            <Text style={styles.summaryAmount} testID="macro-detail-amount" accessibilityLiveRegion="polite">
              {model.amountLabel}
            </Text>
            {model.percentLabel !== "—" ? (
              <Text style={styles.summaryPercent}>{model.percentLabel}</Text>
            ) : null}
          </View>
          <LinearProgressBar
            progress={model.progress}
            trackColor={NUTRITION_PROGRESS_TRACK_BG}
            fillColor={NUTRITION_ACCENT}
            height={8}
            borderRadius={4}
            testID="macro-detail-progress"
          />
          <Text style={styles.summaryCaption}>
            {model.percentLabel !== "—"
              ? `${model.percentLabel} of your ${model.targetValue.toLocaleString()} g goal`
              : `Goal ${model.targetValue.toLocaleString()} g`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Logged foods</Text>
        {model.foods.length === 0 ? (
          <EmptyState
            title={`No ${title.toLowerCase()} logged`}
            description="Foods you log for this day will appear here."
          />
        ) : (
          <View style={styles.foodsCard} accessibilityRole="list">
            {model.foods.map((row, index) => (
              <View key={row.id} style={[styles.foodRow, index === 0 && styles.foodRowFirst]}>
                <View style={styles.foodMain}>
                  <Text style={styles.foodTitle} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Text style={styles.foodSubtitle} numberOfLines={1}>
                    {row.subtitle}
                  </Text>
                </View>
                <Text style={styles.foodValue} numberOfLines={1}>
                  {row.valueLabel}
                </Text>
              </View>
            ))}
          </View>
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
  title: { fontSize: 28, fontWeight: "800", color: UI_TEXT_PRIMARY, letterSpacing: -0.4 },
  dayLabel: { fontSize: 15, fontWeight: "500", color: UI_TEXT_SECONDARY, marginTop: 2 },
  summaryCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 10,
  },
  summaryHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  summaryPercent: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
  },
  summaryCaption: { fontSize: 13, color: UI_TEXT_TERTIARY_LABEL, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY },
  foodsCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 0,
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  foodRowFirst: { borderTopWidth: 0, paddingTop: 2 },
  foodMain: { flex: 1, minWidth: 0, gap: 3 },
  foodTitle: { fontSize: 17, fontWeight: "600", color: UI_TEXT_PRIMARY, letterSpacing: -0.28 },
  foodSubtitle: { fontSize: 13, fontWeight: "400", color: UI_TEXT_TERTIARY_LABEL, letterSpacing: -0.08 },
  foodValue: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
});
