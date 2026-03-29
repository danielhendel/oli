/**
 * Strength Analytics — weekly strength, muscle groups, monthly and yearly workout charts.
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

export default function StrengthAnalyticsDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    focusSection?: string;
    focusEmphasis?: string;
    focusMuscle?: string;
  }>();
  const { user, initializing } = useAuth();
  const { models, calendarReady } = useStrengthAnalyticsDetailScreenData(user?.uid);

  const scrollRef = useRef<ScrollView>(null);
  const scrollRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const pendingScrollSectionRef = useRef<StrengthAnalyticsSectionTarget | null>(null);
  const sectionYRef = useRef<Partial<Record<StrengthAnalyticsSectionTarget, number>>>({});
  const lastConsumedFocusKeyRef = useRef<string | null>(null);

  const [emphasizedSection, setEmphasizedSection] = useState<StrengthAnalyticsSectionTarget | null>(null);
  const [muscleGroupInitialTab, setMuscleGroupInitialTab] = useState<"volume" | "sets" | undefined>(
    undefined,
  );

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
      title: "Strength Analytics",
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

    pendingScrollSectionRef.current = dest.section;
    setEmphasizedSection(dest.section);
    if (dest.section === "weekly_muscle_group") {
      if (dest.emphasis === "sets") setMuscleGroupInitialTab("sets");
      else setMuscleGroupInitialTab("volume");
    } else {
      setMuscleGroupInitialTab(undefined);
    }

    tryScrollToSection(dest.section);
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
        {...(muscleGroupInitialTab != null ? { muscleGroupInitialTab } : {})}
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
