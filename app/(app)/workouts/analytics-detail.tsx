/**
 * Strength Analytics — yearly strength workouts chart for the overview analytics calendar year (`WORKOUT_OVERVIEW_ANALYTICS_YEAR`).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStrengthAnalyticsDetailScreenData } from "@/lib/hooks/useStrengthAnalyticsDetailScreenData";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { StrengthTrainingAnalyticsCards } from "@/lib/ui/workouts/StrengthTrainingAnalyticsCards";
import {
  clearedStrengthAnalyticsFocusParams,
  parseStrengthAnalyticsFocusFromParams,
  type StrengthAnalyticsSectionTarget,
} from "@/lib/workouts/navigation/strengthAnalyticsNavigationIntent";

const EMPHASIS_CLEAR_MS = 2400;

/** Weekly Insights still serialize legacy sections; map removed UI targets to the yearly card. */
function normalizeStrengthAnalyticsSection(section: StrengthAnalyticsSectionTarget): StrengthAnalyticsSectionTarget {
  if (
    section === "weekly_strength" ||
    section === "weekly_muscle_group" ||
    section === "monthly_workouts"
  ) {
    return "yearly_workouts";
  }
  return section;
}

export default function StrengthAnalyticsDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    focusSection?: string;
    focusEmphasis?: string;
    focusMuscle?: string;
  }>();
  const { user, initializing, getIdToken } = useAuth();
  const { models, calendarReady } = useStrengthAnalyticsDetailScreenData(user?.uid, () => getIdToken(false));

  const scrollRef = useRef<ScrollView>(null);
  const scrollRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const pendingScrollSectionRef = useRef<StrengthAnalyticsSectionTarget | null>(null);
  const sectionYRef = useRef<Partial<Record<StrengthAnalyticsSectionTarget, number>>>({});
  const lastConsumedFocusKeyRef = useRef<string | null>(null);

  const [emphasizedSection, setEmphasizedSection] = useState<StrengthAnalyticsSectionTarget | null>(null);

  const tryScrollToSection = useCallback((section: StrengthAnalyticsSectionTarget) => {
    const y = sectionYRef.current[section];
    if (y == null) return;
    pendingScrollSectionRef.current = null;
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    });
  }, []);

  const onAnalyticsSectionLayout = useCallback(
    (section: StrengthAnalyticsSectionTarget, y: number) => {
      sectionYRef.current[section] = y;
      if (pendingScrollSectionRef.current === section) {
        tryScrollToSection(section);
      }
    },
    [tryScrollToSection],
  );

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "",
      headerTitle: "",
      headerStyle: {
        backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { width: 0, height: 0 },
      },
      headerShadowVisible: false,
    });
  }, [navigation]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!calendarReady || models == null) return;

    const raw = params as Record<string, string | string[] | undefined>;
    const dest = parseStrengthAnalyticsFocusFromParams(raw);
    if (dest == null) {
      lastConsumedFocusKeyRef.current = null;
      return;
    }

    const focusKey = `${String(params.focusSection ?? "")}|${String(params.focusEmphasis ?? "")}|${String(params.focusMuscle ?? "")}`;
    if (lastConsumedFocusKeyRef.current === focusKey) return;
    lastConsumedFocusKeyRef.current = focusKey;

    const canonicalSection = normalizeStrengthAnalyticsSection(dest.section);
    pendingScrollSectionRef.current = canonicalSection;
    setEmphasizedSection(canonicalSection);

    tryScrollToSection(canonicalSection);
    router.setParams(clearedStrengthAnalyticsFocusParams());

    const t = setTimeout(() => setEmphasizedSection(null), EMPHASIS_CLEAR_MS);
    return () => clearTimeout(t);
  }, [
    calendarReady,
    models,
    params.focusSection,
    params.focusEmphasis,
    params.focusMuscle,
    router,
    tryScrollToSection,
  ]);

  if (initializing) {
    return (
      <View style={styles.body}>
        <LoadingState message="Loading…" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.body}>
        <EmptyState title="Sign in" description="Sign in to view strength analytics." />
      </View>
    );
  }

  if (!calendarReady || models == null) {
    return (
      <View style={styles.body}>
        <LoadingState message="Loading workouts…" />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <StrengthTrainingAnalyticsCards
        models={models}
        emphasizedSection={emphasizedSection}
        onAnalyticsSectionLayout={onAnalyticsSectionLayout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  scroll: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
});
