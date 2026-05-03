/**
 * Strength Planning Hub — quick links to create, log, browse exercises, and review sessions.
 * No program persistence yet (see disabled Create Program CTA).
 */

import React, { useEffect, type ReactElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

const ROUTE_CREATE_WORKOUT = "/(app)/workouts/create" as const;
const ROUTE_STRENGTH_LOG = "/(app)/workouts/log" as const;
const ROUTE_EXERCISE_PICKER = "/(app)/workouts/exercise-picker" as const;
const ROUTE_RECENT_WORKOUTS = "/(app)/workouts/recent-workouts-full" as const;

export type StrengthPlanHubCardProps = {
  title: string;
  children: ReactNode;
  testID?: string;
  /** Optional trailing chrome on the title row (e.g. status pill). */
  titleRight?: ReactNode;
};

function StrengthPlanHubCard({ title, children, testID, titleRight }: StrengthPlanHubCardProps): ReactElement {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {titleRight}
      </View>
      {children}
    </View>
  );
}

export type StrengthPlanPillProps = {
  label: string;
};

function StrengthPlanPill({ label }: StrengthPlanPillProps): ReactElement {
  return (
    <View style={styles.pill} accessibilityLabel={`${label} status`}>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export default function WorkoutsPlanScreen(): ReactElement {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Strength" subtitle="Plan" hideTitleChrome>
      <View style={styles.stack}>
        <View style={styles.heroCard} testID="strength-plan-hero-card">
          <Text style={styles.heroTitle} accessibilityRole="header">
            Build your strength plan
          </Text>
          <Text style={styles.heroSubtitle}>
            Create workouts, organize training days, and turn sessions into a repeatable program.
          </Text>
          <View style={styles.heroCtaColumn}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create workout"
              onPress={() => router.push(ROUTE_CREATE_WORKOUT)}
              style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPrimaryPressed]}
              testID="strength-plan-hero-create-workout"
            >
              <Text style={styles.ctaPrimaryLabel}>Create Workout</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start strength log"
              onPress={() => router.push(ROUTE_STRENGTH_LOG)}
              style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaSecondaryPressed]}
              testID="strength-plan-hero-start-log"
            >
              <Text style={styles.ctaSecondaryLabel}>Start Strength Log</Text>
            </Pressable>
          </View>
        </View>

        <StrengthPlanHubCard
          title="Current Program"
          testID="strength-plan-current-program-card"
          titleRight={<StrengthPlanPill label="Setup" />}
        >
          <Text style={styles.cardHeadline}>No active program yet</Text>
          <Text style={styles.cardBody}>
            Programs will help you organize workouts, track adherence, and progress over time.
          </Text>
          {/* TODO: Enable when a real create-program route + persistence exists (no fake paths). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create program. Not available yet."
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.ctaDisabled}
            testID="strength-plan-create-program-disabled"
          >
            <Text style={styles.ctaDisabledLabel}>Create Program</Text>
          </Pressable>
        </StrengthPlanHubCard>

        <StrengthPlanHubCard title="Workout Templates" testID="strength-plan-templates-card">
          <Text style={styles.cardBody}>
            Save repeatable workouts for push, pull, legs, upper, lower, or custom training days.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create workout"
            onPress={() => router.push(ROUTE_CREATE_WORKOUT)}
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPrimaryPressed]}
            testID="strength-plan-templates-create-workout"
          >
            <Text style={styles.ctaPrimaryLabel}>Create Workout</Text>
          </Pressable>
        </StrengthPlanHubCard>

        <StrengthPlanHubCard title="Exercise Library" testID="strength-plan-exercise-library-card">
          <Text style={styles.cardBody}>
            Browse exercises, manage movements, and build workouts faster.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open exercise library"
            onPress={() => router.push(ROUTE_EXERCISE_PICKER)}
            style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaSecondaryPressed]}
            testID="strength-plan-open-exercise-library"
          >
            <Text style={styles.ctaSecondaryLabel}>Browse exercises</Text>
          </Pressable>
        </StrengthPlanHubCard>

        <StrengthPlanHubCard title="Recent Workouts" testID="strength-plan-recent-card">
          <Text style={styles.cardBody}>
            Review completed sessions and turn your best days into repeatable templates.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open recent strength workouts"
            onPress={() => router.push(ROUTE_RECENT_WORKOUTS)}
            style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaSecondaryPressed]}
            testID="strength-plan-open-recent-workouts"
          >
            <Text style={styles.ctaSecondaryLabel}>View recent workouts</Text>
          </Pressable>
        </StrengthPlanHubCard>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20,
    alignSelf: "stretch",
  },
  heroCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.4,
    lineHeight: 29,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    lineHeight: 21,
  },
  heroCtaColumn: {
    gap: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    ...elevatedCardSurfaceStyle,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: "flex-start",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.06,
    color: SYSTEM_ACCENT,
  },
  cardHeadline: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    lineHeight: 21,
  },
  cardBody: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    lineHeight: 21,
  },
  ctaPrimary: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctaPrimaryPressed: {
    opacity: 0.88,
  },
  ctaPrimaryLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  ctaSecondary: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: SYSTEM_ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  ctaSecondaryPressed: {
    opacity: 0.85,
  },
  ctaSecondaryLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
    letterSpacing: -0.2,
  },
  ctaDisabled: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    opacity: 0.45,
  },
  ctaDisabledLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.2,
  },
});
