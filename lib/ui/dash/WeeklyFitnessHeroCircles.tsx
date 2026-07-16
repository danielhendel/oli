/**
 * Dual equal hero circles for Weekly Fitness — presentation only.
 */
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { WeeklyFitnessHeroCircleModel } from "@/lib/data/dash/buildWeeklyFitnessCardModel";
import { CircularProgressRing } from "@/lib/ui/progress/CircularProgressRing";
import {
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_MUTED,
} from "@/lib/ui/theme/uiTokens";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";

const HERO_RING_SIZE = 128;
const HERO_RING_STROKE = 8;

type Props = {
  weeklyProgress: WeeklyFitnessHeroCircleModel;
  bodyComposition: WeeklyFitnessHeroCircleModel;
};

function HeroCircle({
  model,
}: {
  model: WeeklyFitnessHeroCircleModel;
}): React.ReactElement {
  const router = useRouter();
  const onPress = useCallback(() => {
    router.push(model.href as Href);
  }, [router, model.href]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      style={({ pressed }) => [styles.column, pressed && styles.pressed]}
      testID={model.testID}
      hitSlop={4}
    >
      <CircularProgressRing
        percent={model.percent}
        size={HERO_RING_SIZE}
        strokeWidth={HERO_RING_STROKE}
        labelStyle={styles.ringLabel}
        label={model.label}
        trackColor={UI_PROGRESS_TRACK_EMPTY}
        progressColor={WEEKLY_FITNESS_BAR_FILL_COLOR}
        accessibilityLabel={model.accessibilityLabel}
        testID={`${model.testID}-ring`}
      />
      <Text style={styles.subtitle} numberOfLines={2}>
        {model.subtitle}
      </Text>
    </Pressable>
  );
}

export function WeeklyFitnessHeroCircles({
  weeklyProgress,
  bodyComposition,
}: Props): React.ReactElement {
  return (
    <View style={styles.row} testID="weekly-fitness-hero-circles">
      <HeroCircle model={weeklyProgress} />
      <HeroCircle model={bodyComposition} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-evenly",
    gap: 12,
    alignSelf: "stretch",
    marginTop: 2,
    marginBottom: 6,
  },
  column: {
    flex: 1,
    maxWidth: HERO_RING_SIZE + 24,
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  pressed: { opacity: 0.88 },
  ringLabel: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.35,
    paddingHorizontal: 6,
    fontVariant: ["tabular-nums"],
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    textAlign: "center",
    letterSpacing: -0.06,
  },
});
