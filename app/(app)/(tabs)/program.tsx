// app/(app)/(tabs)/program.tsx
// Oli — Program: Weekly Progress + honest empty state (Stage 1B).
// Not yet coordinated My Plan. Placeholder builders are not launch-facing.
import React, { useMemo } from "react";
import { Pressable, ScrollView, View, StyleSheet, Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import type { ProgramSummary } from "@/lib/data/program/types";
import {
  WEEKLY_PROGRESS_CONSUMER_TITLE,
  WEEKLY_PROGRESS_SUPPORTING_COPY,
  isDashWeeklyProgressRelocationEnabled,
} from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { ProgramCurrentScreen } from "@/lib/ui/program/ProgramCurrentScreen";
import { WeeklyFitnessCardHost } from "@/lib/ui/dash/WeeklyFitnessCardHost";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";

const WORKOUT_BUILDER_HREF = "/(app)/program/workout" as const;

export default function ProgramScreen() {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const showWeeklyProgress = isDashWeeklyProgressRelocationEnabled();

  // v1: no program document persistence yet — active programs list stays empty.
  const currentPrograms: ProgramSummary[] = useMemo(() => [], []);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Program" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {showWeeklyProgress ? (
            <View testID="program-weekly-progress-section" accessibilityLabel="Weekly progress section">
              <WeeklyFitnessCardHost
                title={WEEKLY_PROGRESS_CONSUMER_TITLE}
                subtitle={WEEKLY_PROGRESS_SUPPORTING_COPY}
                cardAccessibilityLabel="Weekly Progress card"
              />
            </View>
          ) : null}

          <ProgramCurrentScreen programs={currentPrograms} embedded />

          <Pressable
            testID="program-workout-builder-link"
            accessibilityRole="button"
            accessibilityLabel="Open workout program builder"
            onPress={() => router.push(WORKOUT_BUILDER_HREF as Href)}
            style={({ pressed }) => [styles.workoutLink, pressed && styles.workoutLinkPressed]}
          >
            <Text style={styles.workoutLinkTitle}>Workout program</Text>
            <Text style={styles.workoutLinkBody}>
              Build a strength workout program. Cardio, nutrition, and recovery builders are not available yet.
            </Text>
          </Pressable>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    gap: 16,
  },
  workoutLink: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 16,
    backgroundColor: UI_CARD_SURFACE,
    gap: 6,
    minHeight: 72,
  },
  workoutLinkPressed: {
    opacity: 0.9,
  },
  workoutLinkTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  workoutLinkBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
});
